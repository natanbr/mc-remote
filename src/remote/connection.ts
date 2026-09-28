import type { BroadcastPayload, ConnectionStatus, RemoteConfig } from '../types.ts';
import { clockSkewWarning, createHintTracker, type ConnectionHint, type HintTimers } from './connectionHint.ts';
import { pairingToApply, redactRoomId, type Pairing } from './pairing.ts';
import { buildSyncRequests } from './remoteProtocol.ts';
import { createStateUpdateReceiver } from './stateUpdateReceiver.ts';

/**
 * The pairing and its realtime channel, without React: the hook injects the Supabase channel,
 * the timers and its state setters, so node:test drives this with fake channels.
 */

/** The part of a Supabase channel this uses; the hook adapts the real one. */
export interface RemoteChannel {
  onStateUpdate: (handler: (payload: unknown) => unknown) => void;
  subscribe: (callback: (status: string, err?: Error) => void) => void;
  unsubscribe: () => void;
  send: (payload: BroadcastPayload) => Promise<string>;
}

export interface RemoteConnectionDeps<Handle> {
  /** False without Supabase or WebCrypto: stay offline rather than send the key unprotected. */
  canConnect: () => boolean;
  openChannel: (roomId: string) => RemoteChannel;
  setStatus: (status: ConnectionStatus) => void;
  setGameState: (state: Record<string, unknown> | null) => void;
  setConfig: (config: RemoteConfig) => void;
  setHint: (hint: ConnectionHint | null) => void;
  /** Shared with the hook's actions, so every outgoing message is signed in order. */
  signInOrder: <T>(task: () => T | Promise<T>) => Promise<T>;
  timers: HintTimers<Handle>;
  now: () => number;
  log: Pick<Console, 'warn' | 'error'>;
}

export interface RemoteConnection {
  /** Mount and same-tab links: connects when the resolved pairing differs from the current one. */
  applyPairing: (resolved: Pairing | null) => void;
  reconnect: () => void;
  pairing: () => Pairing | null;
  /** The channel that joined last, for actions. */
  joinedChannel: () => RemoteChannel | null;
  /** Unmount. Only stops the timer: StrictMode's simulated unmount keeps the live connection. */
  cancelHintTimer: () => void;
}

// Log the message only: an Error's cause can quote the raw server reply, channel topic (room id) included.
export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface Connection {
  channel: RemoteChannel;
  close: () => void;
  cancelHintTimer: () => void;
}

export function createRemoteConnection<Handle>(deps: RemoteConnectionDeps<Handle>): RemoteConnection {
  let pairing: Pairing | null = null;
  // The connection created last. Only it may change what the phone shows or sends, whether or not
  // an older channel joins later: a channel that never joined is otherwise never unsubscribed.
  let latest: Connection | null = null;
  let joined: RemoteChannel | null = null;
  let lastAcceptedTimestamp = 0;

  function connect(): void {
    const current = pairing;
    if (!current) return;
    if (!deps.canConnect()) {
      deps.setStatus('offline');
      return;
    }

    const previous = latest;
    latest = null; // so the previous channel's own CLOSED callback already counts as stale
    previous?.close();
    deps.setHint(null);
    deps.setStatus('connecting');

    const channel = deps.openChannel(current.roomId);
    const hints = createHintTracker(deps.setHint, deps.timers);
    let closed = false;
    const connection: Connection = {
      channel,
      close: () => {
        hints.cancel();
        if (closed) return; // unsubscribe can report CLOSED synchronously, straight back here
        closed = true;
        channel.unsubscribe();
      },
      cancelHintTimer: hints.cancel,
    };
    latest = connection;
    const isLatest = () => latest === connection;

    const receiver = createStateUpdateReceiver({
      getSecretKey: () => pairing?.secretKey ?? null,
      isCurrentChannel: isLatest,
      getMode: () => pairing?.mode ?? 'legacy',
      getLast: () => lastAcceptedTimestamp,
      setLast: (timestamp) => {
        lastAcceptedTimestamp = timestamp;
      },
      onState: (state) => {
        deps.setGameState(state);
        hints.stateAccepted();
      },
      onClockSkew: (diffMs) => {
        deps.log.warn(clockSkewWarning(diffMs));
        hints.clockSkewed();
      },
      now: deps.now,
    });

    channel.onStateUpdate((payload) =>
      receiver.receive(payload).catch((e) => deps.log.error('[Remote] Could not verify a state update:', messageOf(e))),
    );

    channel.subscribe((status, err) => {
      if (!isLatest()) {
        connection.close();
        return;
      }
      if (err) {
        deps.log.error('[Remote] Realtime subscribe failed:', redactRoomId(err.message, current.roomId));
        hints.cancel();
        deps.setStatus('offline');
        return;
      }
      if (status !== 'SUBSCRIBED') {
        hints.cancel();
        deps.setStatus('offline');
        return;
      }
      // Every SUBSCRIBED, an automatic rejoin included.
      deps.setStatus('connected');
      joined = channel;
      receiver.connected();
      const syncPairing = pairing;
      if (!syncPairing) return;
      deps
        .signInOrder(() => buildSyncRequests(syncPairing.mode, syncPairing.secretKey))
        .then((payloads) => Promise.all(payloads.map((payload) => channel.send(payload))))
        .catch((e) => deps.log.error('[Remote] Sync request failed:', messageOf(e)));
      hints.syncRequested();
    });
  }

  return {
    applyPairing: (resolved) => {
      const next = pairingToApply(pairing, resolved);
      if (!next) return;
      pairing = next;
      deps.setGameState(null);
      deps.setConfig({ roomId: next.roomId, secretKey: next.secretKey });
      connect();
    },
    reconnect: connect,
    pairing: () => pairing,
    joinedChannel: () => joined,
    cancelHintTimer: () => latest?.cancelHintTimer(),
  };
}
