import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BroadcastPayload, ConnectionStatus, RemoteConfig } from '../types.ts';
import type { ConnectionHint } from './connectionHint.ts';
import type { Pairing } from './pairing.ts';
import { sealRemoteMessage } from './remoteAuth.ts';
import { createSerialQueue } from './remoteProtocol.ts';
import { createRemoteConnection } from './connection.ts';

const NOW = 1_700_000_000_000;
const ROOM_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const ROOM_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const PAIR_A: Pairing = { roomId: ROOM_A, secretKey: 'KEY-A-0123456789', mode: 'v2' };
const PAIR_B: Pairing = { roomId: ROOM_B, secretKey: 'KEY-B-0123456789', mode: 'v2' };
const LEGACY_A: Pairing = { ...PAIR_A, mode: 'legacy' };
const STATE = { bankCount: 3 };

/** A channel the test drives: it joins, fails or delivers when the test says so. */
function fakeChannel(roomId: string, options: { closeSynchronously?: boolean } = {}) {
  let subscribeCallback: ((status: string, err?: Error) => void) | null = null;
  const handlers: ((payload: unknown) => unknown)[] = [];
  const channel = {
    roomId,
    unsubscribed: 0,
    sent: [] as BroadcastPayload[],
    onStateUpdate: (handler: (payload: unknown) => unknown) => void handlers.push(handler),
    subscribe: (callback: (status: string, err?: Error) => void) => {
      subscribeCallback = callback;
    },
    unsubscribe: () => {
      channel.unsubscribed++;
      // Phoenix closes a channel that cannot push (never joined, or offline) synchronously,
      // and the subscribe callback then receives CLOSED.
      if (options.closeSynchronously) subscribeCallback?.('CLOSED');
    },
    send: (payload: BroadcastPayload) => {
      channel.sent.push(payload);
      return Promise.resolve('ok');
    },
    status: (status: string, err?: Error) => subscribeCallback?.(status, err),
    deliver: async (payload: unknown) => {
      await Promise.all(handlers.map((handler) => handler(payload)));
    },
  };
  return channel;
}
type FakeChannel = ReturnType<typeof fakeChannel>;

function harness(options: { canConnect?: boolean; closeSynchronously?: boolean; now?: () => number } = {}) {
  const channels: FakeChannel[] = [];
  const statuses: ConnectionStatus[] = [];
  const hints: (ConnectionHint | null)[] = [];
  const gameStates: (Record<string, unknown> | null)[] = [];
  const configs: RemoteConfig[] = [];
  const logs: unknown[][] = [];
  const pendingSigns: Promise<unknown>[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const queue = createSerialQueue();
  const connection = createRemoteConnection({
    canConnect: () => options.canConnect ?? true,
    openChannel: (roomId) => {
      const channel = fakeChannel(roomId, { closeSynchronously: options.closeSynchronously });
      channels.push(channel);
      return channel;
    },
    setStatus: (status) => statuses.push(status),
    setGameState: (state) => gameStates.push(state),
    setConfig: (config) => configs.push(config),
    setHint: (hint) => hints.push(hint),
    signInOrder: <T>(task: () => T | Promise<T>) => {
      const result = queue(task);
      pendingSigns.push(result);
      return result;
    },
    timers: {
      set: (callback) => {
        const id = nextTimer++;
        timers.set(id, callback);
        return id;
      },
      clear: (id) => void timers.delete(id),
    },
    now: options.now ?? (() => NOW),
    log: {
      warn: (...args: unknown[]) => void logs.push(['warn', ...args]),
      error: (...args: unknown[]) => void logs.push(['error', ...args]),
    },
  });
  const fireTimers = () => {
    const due = [...timers.values()];
    timers.clear();
    for (const callback of due) callback();
  };
  /** Waits until every sync request has been signed and handed to its channel. */
  const flushSends = async () => {
    await Promise.allSettled(pendingSigns);
    await Promise.resolve();
  };
  return { connection, channels, statuses, hints, gameStates, configs, logs, timers, fireTimers, flushSends };
}

const signedState = (pairing: Pairing, timestamp = NOW) =>
  sealRemoteMessage(pairing.secretKey, 'state-update', { state: STATE, timestamp });

// --- item 1: only the channel created last may act ----------------------------------------

test('a new link unsubscribes the previous channel at once, even one that never joined', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A); // offline or behind a captive portal: A never joins
  h.connection.applyPairing(PAIR_B);
  assert.equal(h.channels.length, 2);
  assert.equal(h.channels[0].unsubscribed, 1);
  assert.equal(h.channels[1].unsubscribed, 0);
});

test('a replaced channel that joins LAST does not take over', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.connection.applyPairing(PAIR_B);
  const [a, b] = h.channels;
  b.status('SUBSCRIBED');
  a.status('SUBSCRIBED'); // the stale join reply arrives after the new one
  await h.flushSends();
  assert.equal(h.connection.joinedChannel(), b);
  assert.equal(a.sent.length, 0, 'no sync request on the stale channel');
  assert.equal(b.sent.length, 1);
  assert.equal(h.timers.size, 1, 'only the current connection waits for an answer');
  assert.deepEqual(h.statuses.slice(-1), ['connected']);
});

test('a replaced channel that joins FIRST never starts a "not answering" wait', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.connection.applyPairing(PAIR_B);
  const [a, b] = h.channels;
  a.status('SUBSCRIBED');
  assert.equal(h.timers.size, 0);
  assert.equal(h.connection.joinedChannel(), null);
  b.status('SUBSCRIBED');
  await b.deliver(await signedState(PAIR_B));
  h.fireTimers();
  assert.ok(!h.hints.includes('not-answering'), 'no false banner');
});

test('a replaced channel\'s CLOSED or error changes nothing on screen', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.connection.applyPairing(PAIR_B);
  const [a, b] = h.channels;
  b.status('SUBSCRIBED');
  a.status('CLOSED');
  a.status('CHANNEL_ERROR', new Error(`join failed for remote-control:${ROOM_A}`));
  assert.deepEqual(h.statuses.slice(-1), ['connected']);
  assert.deepEqual(h.logs, []);
});

test('a state arriving on a replaced channel is dropped', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  const [a] = h.channels;
  a.status('SUBSCRIBED');
  h.connection.reconnect();
  await a.deliver(await signedState(PAIR_A));
  assert.ok(!h.gameStates.some((state) => state !== null));
});

test('closing a channel that reports CLOSED synchronously unsubscribes it once, without looping', () => {
  const h = harness({ closeSynchronously: true });
  h.connection.applyPairing(PAIR_A);
  h.connection.applyPairing(PAIR_B);
  assert.equal(h.channels[0].unsubscribed, 1);
  assert.deepEqual(h.statuses, ['connecting', 'connecting'], 'the replaced channel\'s CLOSED is not shown');
});

// --- item 2: the banner and state wiring ---------------------------------------------------

test('the "not answering" wait starts only after SUBSCRIBED, never on connect or on a failed join', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  const [a] = h.channels;
  assert.equal(h.timers.size, 0, 'not while joining');
  a.status('TIMED_OUT');
  a.status('CHANNEL_ERROR', new Error('boom'));
  assert.equal(h.timers.size, 0, 'not after a failed join');
  a.status('SUBSCRIBED');
  assert.equal(h.timers.size, 1);
  h.fireTimers();
  assert.deepEqual(h.hints.filter((hint) => hint !== null), ['not-answering']);
});

test('an accepted state clears the hint and stops the wait', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  const [a] = h.channels;
  a.status('SUBSCRIBED');
  await a.deliver(await signedState(PAIR_A));
  assert.deepEqual(h.gameStates.slice(-1), [STATE]);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.hints.slice(-1), [null]);
});

// The desktop refuses every action more than 60 s off its clock (MAX_ACTION_AGE_MS). With clocks
// 60-120 s apart the phone used to show this state as live while every press was dropped.
test('clocks 60-120 s apart: the state is refused and the clock hint shows, not a live view', async () => {
  for (const offset of [61_000, -61_000, 90_000, -90_000, 119_000, -119_000]) {
    const h = harness();
    h.connection.applyPairing(PAIR_A);
    const [a] = h.channels;
    a.status('SUBSCRIBED');
    await a.deliver(await signedState(PAIR_A, NOW + offset));
    assert.ok(!h.gameStates.some((state) => state !== null), `${offset} ms: no state shown`);
    assert.deepEqual(h.hints.slice(-1), ['clock-skew'], `${offset} ms: the clock hint`);
    assert.equal(h.timers.size, 0, `${offset} ms: the desktop answered, no "not answering" wait`);
    assert.equal(h.logs.length, 1, `${offset} ms: one console warning`);
  }
});

test('clocks up to 55 s apart: the state is shown and no hint, as before', async () => {
  for (const offset of [0, 30_000, -30_000, 54_000, -54_000, 55_000, -55_000]) {
    const h = harness();
    h.connection.applyPairing(PAIR_A);
    const [a] = h.channels;
    a.status('SUBSCRIBED');
    await a.deliver(await signedState(PAIR_A, NOW + offset));
    assert.deepEqual(h.gameStates.slice(-1), [STATE], `${offset} ms: shown`);
    assert.deepEqual(h.hints.slice(-1), [null], `${offset} ms: no hint`);
    assert.deepEqual(h.logs, [], `${offset} ms: no warning`);
  }
});

test('Reconnect clears a hint that is showing', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.channels[0].status('SUBSCRIBED');
  h.fireTimers();
  assert.deepEqual(h.hints.slice(-1), ['not-answering']);
  h.connection.reconnect();
  assert.deepEqual(h.hints.slice(-1), [null]);
  assert.equal(h.channels.length, 2);
});

test('a new pairing clears the previous pairing\'s game state and config', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  const [a] = h.channels;
  a.status('SUBSCRIBED');
  await a.deliver(await signedState(PAIR_A));
  h.connection.applyPairing(PAIR_B);
  assert.deepEqual(h.gameStates.slice(-1), [null]);
  assert.deepEqual(h.configs.slice(-1), [{ roomId: ROOM_B, secretKey: PAIR_B.secretKey }]);
  assert.equal(h.channels[1].roomId, ROOM_B);
});

test('the same pairing again does not reconnect', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.connection.applyPairing({ ...PAIR_A });
  h.connection.applyPairing(null);
  assert.equal(h.channels.length, 1);
});

test('every SUBSCRIBED (an automatic rejoin included) sends one sync request and restarts the wait', async () => {
  const h = harness();
  h.connection.applyPairing(LEGACY_A);
  const [a] = h.channels;
  a.status('SUBSCRIBED');
  a.status('CLOSED');
  assert.equal(h.timers.size, 0, 'a lost channel stops waiting');
  a.status('SUBSCRIBED'); // realtime rejoined by itself
  await h.flushSends();
  assert.equal(a.sent.length, 2);
  assert.ok(a.sent.every((payload) => 'key' in payload && payload.action.type === 'SYNC_REQUEST'), 'legacy mode: legacy requests only');
  assert.equal(h.timers.size, 1);
});

test('a rejoin resets the replay window (a desktop clock set back does not freeze the view)', async () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  const [a] = h.channels;
  a.status('SUBSCRIBED');
  await a.deliver(await signedState(PAIR_A, NOW + 30_000)); // inside the 55 s clock bound
  await a.deliver(await signedState(PAIR_A, NOW));
  assert.equal(h.gameStates.filter((state) => state !== null).length, 1);
  a.status('SUBSCRIBED');
  await a.deliver(await signedState(PAIR_A, NOW));
  assert.equal(h.gameStates.filter((state) => state !== null).length, 2);
});

test('the subscribe error is logged as text with the room id shortened', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.channels[0].status('CHANNEL_ERROR', new Error(`join failed: remote-control:${ROOM_A}`, { cause: { topic: ROOM_A } }));
  assert.deepEqual(h.statuses.slice(-1), ['offline']);
  assert.deepEqual(h.logs, [['error', '[Remote] Realtime subscribe failed:', 'join failed: remote-control:aaaaaaaa…']]);
});

test('without WebCrypto or Supabase the connection stays offline and opens no channel', () => {
  const h = harness({ canConnect: false });
  h.connection.applyPairing(PAIR_A);
  assert.equal(h.channels.length, 0);
  assert.deepEqual(h.statuses, ['offline']);
});

test('dispatch sees the pairing and the channel that joined last', () => {
  const h = harness();
  assert.equal(h.connection.pairing(), null);
  h.connection.applyPairing(PAIR_A);
  assert.deepEqual(h.connection.pairing(), PAIR_A);
  assert.equal(h.connection.joinedChannel(), null);
  h.channels[0].status('SUBSCRIBED');
  assert.equal(h.connection.joinedChannel(), h.channels[0]);
});

test('cancelling the hint timer (unmount) stops the wait and leaves the connection usable', () => {
  const h = harness();
  h.connection.applyPairing(PAIR_A);
  h.channels[0].status('SUBSCRIBED');
  h.connection.cancelHintTimer();
  assert.equal(h.timers.size, 0);
  h.channels[0].status('SUBSCRIBED');
  assert.equal(h.timers.size, 1);
});

test('replacing a joined connection cancels its "not answering" wait (new link or Reconnect)', () => {
  // Without the cancel, A's timer fires after the switch and shows a false banner.
  for (const replace of [
    (h: ReturnType<typeof harness>) => h.connection.applyPairing(PAIR_B),
    (h: ReturnType<typeof harness>) => h.connection.reconnect(),
  ]) {
    const h = harness();
    h.connection.applyPairing(PAIR_A);
    h.channels[0].status('SUBSCRIBED');
    assert.equal(h.timers.size, 1, 'A is waiting for an answer');
    replace(h);
    assert.equal(h.timers.size, 0, "the replaced connection's wait is cancelled");
    assert.ok(!h.hints.includes('not-answering'));
  }
});

// An Error's cause can quote the raw server reply (channel topic, so the full room id): whatever
// fails, the log gets text only. Catches `messageOf(e)` being replaced by `e` in either catch.
test('a failed sync request and a failed state verification log text, never an error object', async () => {
  const empty: Pairing = { ...PAIR_A, secretKey: '' }; // WebCrypto refuses a zero-length HMAC key
  const sync = harness();
  sync.connection.applyPairing(empty);
  sync.channels[0].status('SUBSCRIBED');
  await sync.flushSends();

  const verify = harness({ now: () => { throw new Error(`clock failed near remote-control:${ROOM_A}`); } });
  verify.connection.applyPairing(PAIR_A);
  verify.channels[0].status('SUBSCRIBED');
  await verify.channels[0].deliver(await signedState(PAIR_A));
  await new Promise((resolve) => setImmediate(resolve));

  const logged = [...sync.logs, ...verify.logs];
  assert.ok(logged.some((entry) => entry[1] === '[Remote] Sync request failed:'), 'the sync failure is logged');
  assert.ok(logged.some((entry) => entry[1] === '[Remote] Could not verify a state update:'), 'the verify failure is logged');
  for (const entry of logged) {
    for (const arg of entry) assert.equal(typeof arg, 'string', `logged a non-string: ${String(arg)}`);
  }
});
