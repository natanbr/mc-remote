import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sealRemoteMessage } from './remoteAuth.ts';
import type { ProtocolMode } from './pairing.ts';
import { createStateUpdateReceiver } from './stateUpdateReceiver.ts';

const KEY = 'AbCdEfGhIjKlMnOpQrSt';
const STATE = { bankCount: 3 };
const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

const signedState = (timestamp: number, state: object = STATE) =>
  sealRemoteMessage(KEY, 'state-update', { state, timestamp });

/** The hook's refs as plain variables the test can move while a message is being verified. */
function harness(initial: { mode?: ProtocolMode; last?: number; secretKey?: string | null } = {}) {
  const refs = {
    mode: initial.mode ?? 'v2',
    last: initial.last ?? 0,
    secretKey: initial.secretKey === undefined ? KEY : initial.secretKey,
    current: true,
  };
  const states: Record<string, unknown>[] = [];
  const skews: number[] = [];
  const receiver = createStateUpdateReceiver({
    getSecretKey: () => refs.secretKey,
    isCurrentChannel: () => refs.current,
    getMode: () => refs.mode,
    getLast: () => refs.last,
    setLast: (timestamp) => {
      refs.last = timestamp;
    },
    onState: (state) => states.push(state),
    onClockSkew: (diffMs) => skews.push(diffMs),
    now: () => NOW,
  });
  return { refs, states, skews, receive: receiver.receive, connected: receiver.connected };
}

/** Records every write to a global localStorage while `run` executes. */
async function storageWritesDuring(run: () => Promise<void>): Promise<string[]> {
  const writes: string[] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: (k: string) => void writes.push(`set ${k}`),
      removeItem: (k: string) => void writes.push(`remove ${k}`),
      clear: () => void writes.push('clear'),
    },
  });
  try {
    await run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  return writes;
}

test('a fresh signed state is shown and becomes the last accepted one', async () => {
  const h = harness({ mode: 'v2' });
  await h.receive(await signedState(NOW));
  assert.deepEqual(h.states, [STATE]);
  assert.equal(h.refs.last, NOW);
});

test('every (re)join resets the last accepted timestamp, including an automatic rejoin', async () => {
  // The desktop clock was set back: without the reset the view freezes until the new clock
  // passes the old one. A realtime rejoin fires SUBSCRIBED on the same receiver.
  const h = harness({ mode: 'v2' });
  h.connected();
  await h.receive(await signedState(NOW));
  await h.receive(await signedState(NOW - 1000));
  assert.deepEqual(h.states, [STATE], 'older than the last one: dropped');
  h.connected();
  assert.equal(h.refs.last, 0);
  await h.receive(await signedState(NOW - 1000));
  assert.deepEqual(h.states, [STATE, STATE], 'accepted after the rejoin');
});

test('it uses the injected clock: a 3-day-old signed state is rejected', async () => {
  const h = harness({ mode: 'v2' });
  await h.receive(await signedState(NOW - 3 * DAY));
  assert.deepEqual(h.states, []);
  assert.equal(h.refs.last, 0);
});

test('a state that finishes verifying after a reconnect is dropped (stale channel)', async () => {
  const h = harness({ mode: 'v2' });
  const pending = h.receive(await signedState(NOW));
  h.refs.current = false; // reconnected while the signature was being checked
  await pending;
  assert.deepEqual(h.states, []);
  assert.equal(h.refs.last, 0);
});

test('a state verified with the previous key is dropped after a same-tab re-pair', async () => {
  const h = harness({ mode: 'v2' });
  const pending = h.receive(await signedState(NOW));
  h.refs.secretKey = 'the-new-pairing-key'; // a new link was opened while this was verifying
  await pending;
  assert.deepEqual(h.states, []);
});

test('the mode is read after the await: a legacy state classified before a re-pair to v2 is dropped', async () => {
  const h = harness({ mode: 'legacy' });
  const pending = h.receive({ key: KEY, state: STATE });
  h.refs.mode = 'v2';
  await pending;
  assert.deepEqual(h.states, []);
});

test('the last timestamp is read after the await: an older state that finishes second is dropped', async () => {
  const h = harness({ mode: 'v2' });
  const pending = h.receive(await signedState(NOW - 1000));
  h.refs.last = NOW; // a newer state was accepted while this one was being verified
  await pending;
  assert.deepEqual(h.states, []);
  assert.equal(h.refs.last, NOW);
});

test('legacy mode rejects a verified signed state and writes nothing to storage (no upgrade)', async () => {
  const h = harness({ mode: 'legacy' });
  const envelope = await signedState(NOW);
  const writes = await storageWritesDuring(() => h.receive(envelope));
  assert.deepEqual(h.states, []);
  assert.deepEqual(writes, [], 'mc_proto must never be written by a received message');
  assert.equal(h.refs.mode, 'legacy');
});

test('a legacy state with the right key is shown in legacy mode', async () => {
  const h = harness({ mode: 'legacy' });
  await h.receive({ key: KEY, state: STATE, timestamp: NOW });
  assert.deepEqual(h.states, [STATE]);
  assert.equal(h.refs.last, 0, 'legacy states do not move the timestamp');
});

test('a forged signed state is not shown', async () => {
  const h = harness({ mode: 'v2' });
  const envelope = await signedState(NOW);
  await h.receive({ ...envelope, body: envelope.body.replace('"bankCount":3', '"bankCount":99') });
  assert.deepEqual(h.states, []);
});

test('in v2 mode the key of a legacy payload is never read', async () => {
  const h = harness({ mode: 'v2' });
  let keyRead = false;
  await h.receive({ state: STATE, get key() { keyRead = true; return KEY; } });
  assert.equal(keyRead, false);
  assert.deepEqual(h.states, []);
});

test('without a pairing key nothing is accepted', async () => {
  const h = harness({ mode: 'legacy', secretKey: null });
  await h.receive({ key: null, state: STATE });
  await h.receive(await signedState(NOW));
  assert.deepEqual(h.states, []);
});

// --- clock skew report -------------------------------------------------------------------

test('a verified state refused only for clock skew is reported once per connection', async () => {
  const h = harness({ mode: 'v2' });
  h.connected();
  await h.receive(await signedState(NOW + 150_000));
  await h.receive(await signedState(NOW + 151_000));
  assert.deepEqual(h.skews, [-150_000], 'once, with the signed difference now - timestamp');
  h.connected();
  await h.receive(await signedState(NOW + 152_000));
  assert.deepEqual(h.skews, [-150_000, -152_000], 'reported again after a rejoin');
  assert.deepEqual(h.states, []);
});

test('an unverified message never triggers the clock-skew report', async () => {
  const v2 = harness({ mode: 'v2' });
  const envelope = await signedState(NOW - 3 * DAY);
  await v2.receive({ ...envelope, sig: envelope.sig.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) });
  await v2.receive({ ...envelope, body: envelope.body.replace('"bankCount":3', '"bankCount":4') });
  assert.deepEqual(v2.skews, []);
  const legacy = harness({ mode: 'legacy' });
  await legacy.receive(envelope); // signed states are not even verified in legacy mode
  assert.deepEqual(legacy.skews, []);
});

test('a stale-channel or re-paired result never triggers the clock-skew report', async () => {
  const h = harness({ mode: 'v2' });
  const pending = h.receive(await signedState(NOW - 3 * DAY));
  h.refs.current = false;
  await pending;
  assert.deepEqual(h.skews, []);
});
