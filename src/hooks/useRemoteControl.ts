import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ConnectionStatus, RemoteConfig, RemoteAction, BroadcastPayload } from '../types';
import { hasWebCrypto } from '../remote/remoteAuth';
import { pairingToApply, redactRoomId, resolvePairing, type Pairing } from '../remote/pairing';
import { buildActionPayload, buildSyncRequests, createSerialQueue, newActionContent } from '../remote/remoteProtocol';
import { createStateUpdateReceiver } from '../remote/stateUpdateReceiver';
import { HINT_TEXT, clockSkewWarning, createHintTracker, type ConnectionHint, type HintTracker } from '../remote/connectionHint';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Every outgoing message is built (signed) through this queue so messages leave in the order
// they were dispatched. Attach the send with `.then` directly on the returned promise.
const signInOrder = createSerialQueue();

// Once per page: StrictMode runs the effect twice in dev, and Reconnect connects again.
let missingWebCryptoReported = false;

function sendBroadcast(ch: RealtimeChannel, payload: BroadcastPayload) {
  return ch.send({ type: 'broadcast', event: 'action', payload });
}

// Log the message only: an Error's cause can quote the raw server reply, channel topic (room id) included.
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function useRemoteControl() {
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<ConnectionHint | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hintTrackerRef = useRef<HintTracker | null>(null);

  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  // The pairing in use. Its mode comes only from the pairing link and never changes on its own.
  const pairingRef = useRef<Pairing | null>(null);
  // Newest signed state accepted on this join; the receiver resets it on every SUBSCRIBED.
  const lastStateTimestampRef = useRef(0);

  const showFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 1500);
  }, []);

  const connectRealtime = useCallback((room: string) => {
    if (!supabase) return;

    // Signing needs WebCrypto. Without it, stay offline: never fall back to sending the key.
    if (!hasWebCrypto()) {
      if (!missingWebCryptoReported) {
        missingWebCryptoReported = true;
        console.error(
          '[Remote] Offline: WebCrypto (crypto.subtle) is unavailable because this page is not a secure context. ' +
          'Open the remote over HTTPS or on localhost; it will not send the pairing key unprotected.'
        );
      }
      setStatus('offline');
      return;
    }

    // Cleanup previous channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    hintTrackerRef.current?.cancel();
    setHint(null);

    setStatus('connecting');
    const ch = supabase.channel(`remote-control:${room}`, {
      config: {
        broadcast: { ack: true }
      }
    });

    // Channel callbacks use these closure-local objects, so a late callback of a replaced
    // channel never touches the current connection's tracker.
    const hints = createHintTracker(setHint, {
      set: (callback, ms) => window.setTimeout(callback, ms),
      clear: (handle) => window.clearTimeout(handle),
    });
    hintTrackerRef.current = hints;
    const receiver = createStateUpdateReceiver({
      getSecretKey: () => pairingRef.current?.secretKey ?? null,
      isCurrentChannel: () => channelRef.current === ch,
      getMode: () => pairingRef.current?.mode ?? 'legacy',
      getLast: () => lastStateTimestampRef.current,
      setLast: (timestamp) => { lastStateTimestampRef.current = timestamp; },
      onState: (state) => {
        setGameState(state);
        hints.stateAccepted();
      },
      onClockSkew: (diffMs) => {
        console.warn(clockSkewWarning(diffMs));
        hints.clockSkewed();
      },
      now: Date.now,
    });
    ch.on('broadcast', { event: 'state-update' }, ({ payload }) => {
      receiver.receive(payload)
        .catch((e) => console.error('[Remote] Could not verify a state update:', messageOf(e)));
    });
    
    ch.subscribe((status, err) => {
      if (err) {
        console.error('[Remote] Realtime subscribe failed:', redactRoomId(err.message, room));
        hints.cancel();
        setStatus('offline');
      } else if (status === 'SUBSCRIBED') {
        setStatus('connected');
        channelRef.current = ch;
        receiver.connected(); // an automatic rejoin lands here too
        
        // Request initial state sync from host
        const pairing = pairingRef.current;
        if (pairing) {
          signInOrder(() => buildSyncRequests(pairing.mode, pairing.secretKey))
            .then((payloads) => Promise.all(payloads.map((payload) => sendBroadcast(ch, payload))))
            .catch((e) => console.error('[Remote] Sync request failed:', messageOf(e)));
          hints.syncRequested();
        }
      } else {
        hints.cancel();
        setStatus('offline');
      }
    });
  }, []);

  // URL (fragment, else query) -> localStorage -> State. Runs on mount and on hashchange: opening
  // a new #room=...&key=... link in this tab is a same-document navigation, not a reload.
  const applyPairingFromUrl = useCallback(() => {
    const { pairing, scrubUrl, warning } = resolvePairing(window.location, localStorage);
    if (scrubUrl) {
      // Drops both the fragment and the query string: the key must not stay in the address bar.
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (warning) console.warn(warning);

    const next = pairingToApply(pairingRef.current, pairing);
    if (!next) return;
    pairingRef.current = next;
    setGameState(null);
    setConfig({ roomId: next.roomId, secretKey: next.secretKey });
    connectRealtime(next.roomId);
  }, [connectRealtime]);

  useEffect(() => {
    applyPairingFromUrl();
    window.addEventListener('hashchange', applyPairingFromUrl);
    return () => {
      window.removeEventListener('hashchange', applyPairingFromUrl);
      hintTrackerRef.current?.cancel();
    };
  }, [applyPairingFromUrl]);

  const dispatchAction = useCallback(async (action: RemoteAction, actionId: string) => {
    const ch = channelRef.current;
    const pairing = pairingRef.current;
    if (!ch || !pairing) return;
    
    // Only block if it's not a game input (which needs high responsiveness)
    if (action.type !== 'SNAKE_DIR' && loadingActions.has(actionId)) return;

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([40]);
    }

    if (action.type !== 'SNAKE_DIR') {
      setLoadingActions(prev => new Set(prev).add(actionId));
    }

    try {
      const res = await signInOrder(() => buildActionPayload(pairing.mode, pairing.secretKey, newActionContent(action)))
        .then((payload) => sendBroadcast(ch, payload));

      if (res === 'ok') {
        showFeedback('Sent! ✨');
      } else {
        showFeedback('Error! ❌');
      }
    } catch (e) {
      console.error('Dispatch failed:', messageOf(e));
      showFeedback('Failed! ⚠️');
    } finally {
      if (action.type !== 'SNAKE_DIR') {
        setLoadingActions(prev => {
          const next = new Set(prev);
          next.delete(actionId);
          return next;
        });
      }
    }
  }, [loadingActions, showFeedback]);

  return {
    config,
    status,
    actionFeedback,
    loadingActions,
    gameState,
    connectionHint: hint ? HINT_TEXT[hint] : null,
    dispatchAction,
    reconnect: () => config?.roomId && connectRealtime(config.roomId),
    isConfigured: !!(supabaseUrl && supabaseKey)
  };
}
