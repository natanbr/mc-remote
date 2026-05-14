import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ConnectionStatus, RemoteConfig, RemoteAction, BroadcastPayload } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export function useRemoteControl() {
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const secretKeyRef = useRef<string | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 1500);
  }, []);

  const connectRealtime = useCallback((room: string) => {
    if (!supabase) return;

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

    ch.on('broadcast', { event: 'state-update' }, (payload: { payload?: { key: string; state: unknown } }) => {
      const { key: receivedKey, state } = payload.payload || {};
      if (receivedKey === secretKeyRef.current) {
        setGameState(state);
      }
    });
    
    ch.subscribe((status, err) => {
      if (err) {
        console.error(err);
        setStatus('offline');
      } else if (status === 'SUBSCRIBED') {
        setStatus('connected');
        channelRef.current = ch;
        
        // Request initial state sync from host
        if (secretKeyRef.current) {
          ch.send({
            type: 'broadcast',
            event: 'action',
            payload: {
              key: secretKeyRef.current,
              msgId: `sync-${Date.now()}`,
              timestamp: Date.now(),
              action: { type: 'SYNC_REQUEST' }
            }
          });
        }
      } else {
        setStatus('offline');
      }
    });
  }, []);

  // Initialization: URL params -> localStorage -> State
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    const urlKey = params.get('key');

    let finalRoom = urlRoom;
    let finalKey = urlKey;

    if (urlRoom && urlKey) {
      localStorage.setItem('mc_room', urlRoom);
      localStorage.setItem('mc_key', urlKey);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      finalRoom = localStorage.getItem('mc_room');
      finalKey = localStorage.getItem('mc_key');
    }

    if (finalRoom && finalKey) {
      secretKeyRef.current = finalKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig({ roomId: finalRoom, secretKey: finalKey });
      connectRealtime(finalRoom);
    }
  }, [connectRealtime]);

  const dispatchAction = useCallback(async (action: RemoteAction, actionId: string) => {
    if (!channelRef.current || !config?.secretKey) return;
    if (loadingActions.has(actionId)) return;

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([40]);
    }

    setLoadingActions(prev => new Set(prev).add(actionId));

    try {
      const payload: BroadcastPayload = {
        key: config.secretKey,
        msgId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        action,
      };

      const res = await channelRef.current.send({
        type: 'broadcast',
        event: 'action',
        payload,
      });

      if (res === 'ok') {
        showFeedback('Sent! ✨');
      } else {
        showFeedback('Error! ❌');
      }
    } catch (e) {
      console.error('Dispatch failed:', e);
      showFeedback('Failed! ⚠️');
    } finally {
      setLoadingActions(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
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
