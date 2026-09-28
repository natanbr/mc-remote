import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ConnectionStatus, RemoteConfig, RemoteAction, BroadcastPayload } from '../types';
import { hasWebCrypto } from '../remote/remoteAuth';
import { resolvePairing, type ProtocolMode } from '../remote/pairing';
import { buildActionPayload, buildSyncRequests, createSerialQueue, newActionContent } from '../remote/remoteProtocol';
import { createStateUpdateReceiver } from '../remote/stateUpdateReceiver';

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
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const secretKeyRef = useRef<string | null>(null);
  const modeRef = useRef<ProtocolMode>('legacy');
  // Newest signed state accepted on this connection; the receiver resets it on every (re)connect.
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

    setStatus('connecting');
    const ch = supabase.channel(`remote-control:${room}`, {
      config: {
        broadcast: { ack: true }
      }
    });

    const receiveStateUpdate = createStateUpdateReceiver({
      getSecretKey: () => secretKeyRef.current,
      isCurrentChannel: () => channelRef.current === ch,
      getMode: () => modeRef.current,
      setMode: (mode) => { modeRef.current = mode; },
      getLast: () => lastStateTimestampRef.current,
      setLast: (timestamp) => { lastStateTimestampRef.current = timestamp; },
      onState: setGameState,
      storage: localStorage,
      now: Date.now,
    });
    ch.on('broadcast', { event: 'state-update' }, ({ payload }) => {
      receiveStateUpdate(payload)
        .catch((e) => console.error('[Remote] Could not verify a state update:', messageOf(e)));
    });
    
    ch.subscribe((status, err) => {
      if (err) {
        console.error('[Remote] Realtime subscribe failed:', err.message);
        setStatus('offline');
      } else if (status === 'SUBSCRIBED') {
        setStatus('connected');
        channelRef.current = ch;
        
        // Request initial state sync from host
        const secretKey = secretKeyRef.current;
        if (secretKey) {
          signInOrder(() => buildSyncRequests(modeRef.current, secretKey))
            .then((payloads) => Promise.all(payloads.map((payload) => sendBroadcast(ch, payload))))
            .catch((e) => console.error('[Remote] Sync request failed:', messageOf(e)));
        }
      } else {
        setStatus('offline');
      }
    });
  }, []);

  // Initialization: URL (fragment, else query) -> localStorage -> State
  useEffect(() => {
    const { pairing, scrubUrl } = resolvePairing(window.location, localStorage);
    if (scrubUrl) {
      // Drops both the fragment and the query string: the key must not stay in the address bar.
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (pairing) {
      secretKeyRef.current = pairing.secretKey;
      modeRef.current = pairing.mode;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig({ roomId: pairing.roomId, secretKey: pairing.secretKey });
      connectRealtime(pairing.roomId);
    }
  }, [connectRealtime]);

  const dispatchAction = useCallback(async (action: RemoteAction, actionId: string) => {
    const ch = channelRef.current;
    const secretKey = config?.secretKey;
    if (!ch || !secretKey) return;
    
    // Only block if it's not a game input (which needs high responsiveness)
    if (action.type !== 'SNAKE_DIR' && loadingActions.has(actionId)) return;

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([40]);
    }

    if (action.type !== 'SNAKE_DIR') {
      setLoadingActions(prev => new Set(prev).add(actionId));
    }

    try {
      const res = await signInOrder(() => buildActionPayload(modeRef.current, secretKey, newActionContent(action)))
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
  }, [config, loadingActions, showFeedback]);

  return {
    config,
    status,
    actionFeedback,
    loadingActions,
    gameState,
    dispatchAction,
    reconnect: () => config?.roomId && connectRealtime(config.roomId),
    isConfigured: !!(supabaseUrl && supabaseKey)
  };
}
