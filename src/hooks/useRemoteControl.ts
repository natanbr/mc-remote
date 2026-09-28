import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ConnectionStatus, RemoteConfig, RemoteAction } from '../types';
import { hasWebCrypto } from '../remote/remoteAuth';
import { resolvePairing } from '../remote/pairing';
import { buildActionPayload, createSerialQueue, newActionContent } from '../remote/remoteProtocol';
import { HINT_TEXT, type ConnectionHint } from '../remote/connectionHint';
import { createRemoteConnection, messageOf, type RemoteChannel } from '../remote/connection';

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

function canConnect(): boolean {
  if (!supabase) return false;
  if (hasWebCrypto()) return true;
  // Signing needs WebCrypto. Without it, stay offline: never fall back to sending the key.
  if (!missingWebCryptoReported) {
    missingWebCryptoReported = true;
    console.error(
      '[Remote] Offline: WebCrypto (crypto.subtle) is unavailable because this page is not a secure context. ' +
      'Open the remote over HTTPS or on localhost; it will not send the pairing key unprotected.'
    );
  }
  return false;
}

function openChannel(roomId: string): RemoteChannel {
  if (!supabase) throw new Error('Supabase is not configured');
  const ch = supabase.channel(`remote-control:${roomId}`, {
    config: {
      broadcast: { ack: true }
    }
  });
  return {
    onStateUpdate: (handler) => {
      ch.on('broadcast', { event: 'state-update' }, ({ payload }) => {
        void handler(payload);
      });
    },
    subscribe: (callback) => {
      ch.subscribe((status, err) => callback(status, err));
    },
    unsubscribe: () => {
      void ch.unsubscribe();
    },
    send: (payload) => ch.send({ type: 'broadcast', event: 'action', payload }),
  };
}

export function useRemoteControl() {
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<ConnectionHint | null>(null);
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);

  // The pairing, its channel and the "not answering" wait live outside React (tested with node:test).
  const [connection] = useState(() => createRemoteConnection({
    canConnect,
    openChannel,
    setStatus,
    setGameState,
    setConfig,
    setHint,
    signInOrder,
    timers: {
      set: (callback, ms) => window.setTimeout(callback, ms),
      clear: (handle) => window.clearTimeout(handle),
    },
    now: Date.now,
    log: console,
  }));

  const showFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 1500);
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
    connection.applyPairing(pairing);
  }, [connection]);

  useEffect(() => {
    applyPairingFromUrl();
    window.addEventListener('hashchange', applyPairingFromUrl);
    return () => {
      window.removeEventListener('hashchange', applyPairingFromUrl);
      connection.cancelHintTimer();
    };
  }, [applyPairingFromUrl, connection]);

  const dispatchAction = useCallback(async (action: RemoteAction, actionId: string) => {
    const ch = connection.joinedChannel();
    const pairing = connection.pairing();
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
        .then((payload) => ch.send(payload));

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
  }, [connection, loadingActions, showFeedback]);

  return {
    config,
    status,
    actionFeedback,
    loadingActions,
    gameState,
    connectionHint: hint ? HINT_TEXT[hint] : null,
    dispatchAction,
    reconnect: connection.reconnect,
    isConfigured: !!(supabaseUrl && supabaseKey)
  };
}
