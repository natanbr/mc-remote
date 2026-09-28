import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sealRemoteMessage } from './remoteAuth.ts';
import type { ProtocolMode } from './pairing.ts';
import { createStateUpdateReceiver } from './stateUpdateReceiver.ts';

const KEY = 'AbCdEfGhIjKlMnOpQrSt';
const STATE = { bankCount: 3 };
const NOW = 1_700_000_000_000;

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
  const modeChanges: ProtocolMode[] = [];
  const storage = new Map<string, string>();
  const receive = createStateUpdateReceiver({
    getSecretKey: () => refs.secretKey,
    isCurrentChannel: () => refs.current,
    getMode: () => refs.mode,
    setMode: (mode) => {
      modeChanges.push(mode);
      refs.mode = mode;
    },
    getLast: () => refs.last,
    setLast: (timestamp) => {
      refs.last = timestamp;
    },
    onState: (state) => states.push(state),
    storage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => void storage.set(k, v),
      removeItem: (k) => void storage.delete(k),
    },
    now: () => NOW,
  });
  return { refs, states, modeChanges, storage, receive };
}

test('a fresh signed state is shown and becomes the last accepted one', async () => {
  const h = harness({ mode: 'v2' });
  await h.receive(await signedState(NOW));
  assert.deepEqual(h.states, [STATE]);
  assert.equal(h.refs.last, NOW);
});

test('creating a receiver (one per connection) resets the last accepted timestamp', async () => {
  // The desktop clock was corrected backwards: without the reset the view freezes until the
  // new clock passes the old one. Reconnect creates a new receiver and is the remedy.
  const h = harness({ mode: 'v2', last: NOW + 60_000 });
  assert.equal(h.refs.last, 0);
  await h.receive(await signedState(NOW));
  assert.deepEqual(h.states, [STATE]);
});

test('it uses the injected clock: a 3-day-old signed state is rejected', async () => {
  const h = harness({ mode: 'v2' });
  await h.receive(await signedState(NOW - 3 * 86_400_000));
  assert.deepEqual(h.states, []);
  assert.equal(h.refs.last, 0);
});

test('a state that finishes verifying after a reconnect is dropped (stale channel)', async () => {
  const h = harness({ mode: 'legacy' });
  const pending = h.receive(await signedState(NOW));
  h.refs.current = false; // reconnected while the signature was being checked
  await pending;
  assert.deepEqual(h.states, []);
  assert.equal(h.refs.last, 0);
  assert.deepEqual(h.modeChanges, []);
  assert.equal(h.storage.has('mc_proto'), false);
});

test('the mode is read after the await: a legacy state classified before a flip to v2 is dropped', async () => {
  const h = harness({ mode: 'legacy' });
  const pending = h.receive({ key: KEY, state: STATE });
  h.refs.mode = 'v2'; // a signed state finished first and upgraded the phone
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

test('a verified signed state in legacy mode flips the mode to v2 and persists mc_proto = "2"', async () => {
  const h = harness({ mode: 'legacy' });
  await h.receive(await signedState(NOW));
  assert.deepEqual(h.states, [STATE]);
  assert.deepEqual(h.modeChanges, ['v2']);
  assert.equal(h.storage.get('mc_proto'), '2');
});

test('a legacy state with the right key is shown in legacy mode but never upgrades', async () => {
  const h = harness({ mode: 'legacy' });
  await h.receive({ key: KEY, state: STATE, timestamp: NOW });
  assert.deepEqual(h.states, [STATE]);
  assert.deepEqual(h.modeChanges, []);
  assert.equal(h.storage.has('mc_proto'), false);
  assert.equal(h.refs.last, 0, 'legacy states do not move the timestamp');
});

test('a forged signed state neither shows nor upgrades', async () => {
  const h = harness({ mode: 'legacy' });
  const envelope = await signedState(NOW);
  await h.receive({ ...envelope, body: envelope.body.replace('"bankCount":3', '"bankCount":99') });
  assert.deepEqual(h.states, []);
  assert.deepEqual(h.modeChanges, []);
  assert.equal(h.storage.has('mc_proto'), false);
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
