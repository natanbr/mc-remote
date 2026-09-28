import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openRemoteMessage, sealRemoteMessage, signRemote } from './remoteAuth.ts';
import {
  buildActionPayload,
  buildSyncRequests,
  classifyStateUpdate,
  createSerialQueue,
  decideStateUpdate,
  newActionContent,
} from './remoteProtocol.ts';
import type { ProtocolMode } from './pairing.ts';
import type { BroadcastPayload } from '../types.ts';

const KEY = 'AbCdEfGhIjKlMnOpQrSt';
const STATE = { bankCount: 3 };
const NOW = 1_700_000_000_000; // the phone's clock in these tests
const SECOND = 1000;
const DAY = 86_400 * SECOND;

/** One incoming state-update: classify (legacy only in legacy mode), then decide. */
async function receive(payload: unknown, mode: ProtocolMode, lastAcceptedTimestamp = 0, now = NOW) {
  return decideStateUpdate(await classifyStateUpdate(payload, KEY, mode === 'legacy'), mode, lastAcceptedTimestamp, now);
}

const signedState = (timestamp: number, state: object = STATE) =>
  sealRemoteMessage(KEY, 'state-update', { state, timestamp });

// --- state-update acceptance -------------------------------------------------------------

test('legacy mode accepts a legacy payload whose key matches (today\'s v1 desktop)', async () => {
  const decision = await receive({ key: KEY, state: STATE, timestamp: 5 }, 'legacy');
  assert.deepEqual(decision, { accept: true, state: STATE, acceptedTimestamp: null, upgradeToV2: false });
});

test('legacy mode rejects a legacy payload with the wrong key or no state', async () => {
  assert.deepEqual(await receive({ key: 'wrong', state: STATE }, 'legacy'), { accept: false });
  assert.deepEqual(await receive({ state: STATE }, 'legacy'), { accept: false });
  assert.deepEqual(await receive({ key: KEY }, 'legacy'), { accept: false });
  assert.deepEqual(await receive({ key: KEY, state: 'x' }, 'legacy'), { accept: false });
});

test('legacy mode accepts a verified signed state and signals the upgrade to v2', async () => {
  const decision = await receive(await signedState(NOW), 'legacy');
  assert.deepEqual(decision, { accept: true, state: STATE, acceptedTimestamp: NOW, upgradeToV2: true });
});

test('v2 mode rejects a legacy { key, state } payload even with the right key', async () => {
  assert.deepEqual(await receive({ key: KEY, state: STATE, timestamp: NOW }, 'v2'), { accept: false });
});

test('with legacy not allowed, the attacker-supplied key of a legacy payload is never read', async () => {
  let keyRead = false;
  const payload = { state: STATE, get key() { keyRead = true; return KEY; } };
  assert.equal(await classifyStateUpdate(payload, KEY, false), null);
  assert.equal(keyRead, false, 'v2 mode must not evaluate payload.key at all');
  assert.equal((await classifyStateUpdate(payload, KEY, true))?.kind, 'legacy');
  assert.equal(keyRead, true);
});

test('v2 mode accepts a verified signed state newer than the last one, without an upgrade signal', async () => {
  const decision = await receive(await signedState(NOW), 'v2', NOW - 1);
  assert.deepEqual(decision, { accept: true, state: STATE, acceptedTimestamp: NOW, upgradeToV2: false });
});

test('a signed state with timestamp <= the last accepted one is dropped (replay / out of order)', async () => {
  for (const mode of ['v2', 'legacy'] as const) {
    assert.deepEqual(await receive(await signedState(NOW), mode, NOW), { accept: false }, `${mode}: equal`);
    assert.deepEqual(await receive(await signedState(NOW - 500), mode, NOW), { accept: false }, `${mode}: older`);
  }
});

test('a genuine signed state recorded 3 days ago is rejected even with nothing accepted yet (after a reload)', async () => {
  const old = await signedState(NOW - 3 * DAY);
  assert.deepEqual(await receive(old, 'v2', 0), { accept: false });
  assert.deepEqual(await receive(old, 'legacy', 0), { accept: false }, 'a stale state must not upgrade the phone either');
});

test('a signed state up to 120 s old on the phone\'s clock is accepted', async () => {
  assert.equal((await receive(await signedState(NOW - 119 * SECOND), 'v2', 0)).accept, true, '119 s old');
  assert.equal((await receive(await signedState(NOW - 120 * SECOND), 'v2', 0)).accept, true, 'exactly 120 s old');
  assert.equal((await receive(await signedState(NOW - 121 * SECOND), 'v2', 0)).accept, false, '121 s old');
});

test('a signed state more than 120 s in the future is rejected', async () => {
  assert.deepEqual(await receive(await signedState(NOW + 121 * SECOND), 'v2', 0), { accept: false });
  assert.equal((await receive(await signedState(NOW + 119 * SECOND), 'v2', 0)).accept, true, '119 s ahead is clock skew, accepted');
});

test('a signed state with a bad sig is rejected in both modes', async () => {
  const envelope = await signedState(NOW);
  const forged = { ...envelope, body: envelope.body.replace('"bankCount":3', '"bankCount":99') };
  assert.deepEqual(await receive(forged, 'v2'), { accept: false });
  assert.deepEqual(await receive(forged, 'legacy'), { accept: false });
  assert.deepEqual(await receive({ ...envelope, sig: 'x' }, 'v2'), { accept: false });
});

test('a signed state-update needs a state object and a finite timestamp', async () => {
  for (const content of [
    { timestamp: NOW },
    { state: 'x', timestamp: NOW },
    { state: [1], timestamp: NOW },
    { state: STATE },
    { state: STATE, timestamp: String(NOW) },
    { state: STATE, timestamp: null },
  ]) {
    const envelope = await sealRemoteMessage(KEY, 'state-update', content);
    assert.deepEqual(await receive(envelope, 'v2'), { accept: false }, JSON.stringify(content));
  }
  // Infinity cannot survive JSON, so sign a hand-written body that parses to a non-finite number.
  const body = `{"state":{},"timestamp":1e999}`;
  const envelope = { v: 2, body, sig: await signRemote(KEY, 'state-update', body) };
  assert.deepEqual(await receive(envelope, 'v2'), { accept: false }, 'timestamp 1e999 parses to Infinity');
});

test('a signed action replayed on the state-update event is rejected', async () => {
  const action = await sealRemoteMessage(KEY, 'action', { state: STATE, timestamp: NOW });
  assert.deepEqual(await receive(action, 'v2'), { accept: false });
  assert.deepEqual(await receive(action, 'legacy'), { accept: false });
});

test('non-object payloads are rejected', async () => {
  for (const payload of [null, undefined, 'state', 7, []]) {
    assert.deepEqual(await receive(payload, 'legacy'), { accept: false });
  }
});

// --- outgoing actions --------------------------------------------------------------------

function assertNoKeyOnTheWire(payload: BroadcastPayload) {
  assert.ok(!('key' in payload), 'no key field');
  assert.ok(!JSON.stringify(payload).includes(KEY), 'the pairing key appears nowhere in the payload');
}

test('v2 mode sends every action (SNAKE_DIR included) as a signed envelope with msgId and timestamp in the body', async () => {
  const content = newActionContent({ type: 'SNAKE_DIR', dir: 'up' }, 1234);
  const payload = await buildActionPayload('v2', KEY, content);
  assertNoKeyOnTheWire(payload);
  const opened = await openRemoteMessage(KEY, 'action', payload);
  assert.deepEqual(opened, { action: { type: 'SNAKE_DIR', dir: 'up' }, msgId: content.msgId, timestamp: 1234 });
  assert.equal(typeof content.msgId, 'string');
  assert.ok(content.msgId.length > 0);
});

test('legacy mode sends the v1 action payload { key, msgId, timestamp, action }', async () => {
  const content = newActionContent({ type: 'ADD_TOKENS', amount: 1 }, 99);
  const payload = await buildActionPayload('legacy', KEY, content);
  assert.deepEqual(payload, { key: KEY, msgId: content.msgId, timestamp: 99, action: { type: 'ADD_TOKENS', amount: 1 } });
});

test('msgIds are unique per message', () => {
  const ids = new Set(Array.from({ length: 50 }, () => newActionContent({ type: 'SNAKE_DIR', dir: 'up' }, 1).msgId));
  assert.equal(ids.size, 50);
});

test('v2 mode subscribes with one signed SYNC_REQUEST and no key', async () => {
  const payloads = await buildSyncRequests('v2', KEY, 777);
  assert.equal(payloads.length, 1);
  assertNoKeyOnTheWire(payloads[0]);
  const opened = await openRemoteMessage(KEY, 'action', payloads[0]);
  assert.deepEqual(opened?.action, { type: 'SYNC_REQUEST' });
  assert.equal(opened?.timestamp, 777);
});

test('legacy mode subscribes with the signed SYNC_REQUEST first, then the legacy one, with distinct msgIds', async () => {
  const [signed, legacy, ...rest] = await buildSyncRequests('legacy', KEY, 777);
  assert.equal(rest.length, 0);
  assertNoKeyOnTheWire(signed);
  const opened = await openRemoteMessage(KEY, 'action', signed);
  assert.deepEqual(opened?.action, { type: 'SYNC_REQUEST' });
  assert.ok(legacy && 'key' in legacy);
  assert.deepEqual({ ...legacy, msgId: '' }, { key: KEY, msgId: '', timestamp: 777, action: { type: 'SYNC_REQUEST' } });
  assert.notEqual(legacy.msgId, opened?.msgId);
});

// --- ordering ----------------------------------------------------------------------------

test('the serial queue hands results over in call order even when a later task finishes first', async () => {
  const run = createSerialQueue();
  const delivered: string[] = [];
  const slow = run(() => new Promise<string>((resolve) => setTimeout(() => resolve('up'), 30)));
  void slow.then((v) => delivered.push(v));
  const fast = run(() => 'left');
  void fast.then((v) => delivered.push(v));
  await Promise.all([slow, fast]);
  assert.deepEqual(delivered, ['up', 'left']);
});

test('the serial queue keeps going after a task fails', async () => {
  const run = createSerialQueue();
  await assert.rejects(run(() => Promise.reject(new Error('boom'))), /boom/);
  assert.equal(await run(() => 'next'), 'next');
});
