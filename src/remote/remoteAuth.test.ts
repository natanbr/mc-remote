import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  getHmacKey,
  hasWebCrypto,
  openRemoteMessage,
  sealRemoteMessage,
  signRemote,
  verifyRemote,
} from './remoteAuth.ts';

// Shared test vector from the protocol v2 spec. The desktop repo pins the same constants;
// if either side changes its signing, one of the two suites goes red.
const KEY = 'AbCdEfGhIjKlMnOpQrSt';
const ACTION_BODY = '{"action":{"type":"SYNC_REQUEST"},"msgId":"m-1","timestamp":1700000000000}';
const ACTION_SIG = 'N771384DdDp5v20_e8LCmHQnbH7C1o8yAYVXxFa9VfM';
const STATE_BODY = '{"state":{"bankCount":3},"timestamp":1700000000000}';
const STATE_SIG = 'l3J5hlOhZqkzzhj_c3T0F8eAs74hYWJH-5Wm1gVU910';

test('WebCrypto is available in this runtime', () => {
  assert.equal(hasWebCrypto(), true);
});

// Without this check a legacy-mode phone on plain http would still send the key: building a
// legacy payload needs no crypto. An insecure context has crypto.getRandomValues but no subtle.
test('hasWebCrypto is false without crypto.subtle', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  assert.ok(original, 'Node defines globalThis.crypto');
  try {
    const insecure = { getRandomValues: <T extends ArrayBufferView>(array: T) => array };
    Object.defineProperty(globalThis, 'crypto', { value: insecure, configurable: true });
    assert.equal(hasWebCrypto(), false, 'insecure context: crypto without subtle');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    assert.equal(hasWebCrypto(), false, 'no crypto at all');
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
  assert.equal(hasWebCrypto(), true, 'restored');
});

test('sign reproduces the shared action vector exactly', async () => {
  assert.equal(await signRemote(KEY, 'action', ACTION_BODY), ACTION_SIG);
});

test('sign reproduces the shared state-update vector exactly', async () => {
  assert.equal(await signRemote(KEY, 'state-update', STATE_BODY), STATE_SIG);
});

test('sign matches Node createHmac over event + "\\n" + body (base64url, no padding)', async () => {
  const body = '{"action":{"type":"SNAKE_DIR","dir":"up"},"msgId":"x","timestamp":1}';
  const expected = createHmac('sha256', KEY).update(`action\n${body}`).digest('base64url');
  const sig = await signRemote(KEY, 'action', body);
  assert.equal(sig, expected);
  assert.doesNotMatch(sig, /[=+/]/);
});

test('verify accepts both shared vectors', async () => {
  assert.equal(await verifyRemote(KEY, 'action', ACTION_BODY, ACTION_SIG), true);
  assert.equal(await verifyRemote(KEY, 'state-update', STATE_BODY, STATE_SIG), true);
});

test('verify rejects a tampered body', async () => {
  const tampered = STATE_BODY.replace('"bankCount":3', '"bankCount":4');
  assert.equal(await verifyRemote(KEY, 'state-update', tampered, STATE_SIG), false);
});

test('verify rejects the other event name (a signed state can never pass as an action)', async () => {
  assert.equal(await verifyRemote(KEY, 'action', STATE_BODY, STATE_SIG), false);
  assert.equal(await verifyRemote(KEY, 'state-update', ACTION_BODY, ACTION_SIG), false);
});

test('verify rejects a wrong key', async () => {
  assert.equal(await verifyRemote('AbCdEfGhIjKlMnOpQrSu', 'state-update', STATE_BODY, STATE_SIG), false);
});

test('verify rejects a wrong-length sig', async () => {
  for (const sig of [STATE_SIG.slice(0, -1), `${STATE_SIG}A`, `${STATE_SIG}=`, '']) {
    assert.equal(await verifyRemote(KEY, 'state-update', STATE_BODY, sig), false, `sig ${JSON.stringify(sig)}`);
  }
});

test('verify rejects a non-string sig', async () => {
  const bytes = Array.from(Buffer.from(STATE_SIG, 'base64url'));
  for (const sig of [undefined, null, 42, bytes, { sig: STATE_SIG }]) {
    assert.equal(await verifyRemote(KEY, 'state-update', STATE_BODY, sig), false, `sig ${JSON.stringify(sig)}`);
  }
});

test('the imported HMAC key is cached per secret', async () => {
  const first = await getHmacKey(KEY);
  assert.equal(await getHmacKey(KEY), first);
  const other = await getHmacKey('another-secret');
  assert.notEqual(other, first);
});

test('seal produces exactly { v: 2, body, sig } with the body string signed and no key', async () => {
  const content = JSON.parse(ACTION_BODY) as object;
  const envelope = await sealRemoteMessage(KEY, 'action', content);
  assert.deepEqual(Object.keys(envelope).sort(), ['body', 'sig', 'v']);
  assert.equal(envelope.v, 2);
  assert.equal(envelope.body, ACTION_BODY);
  assert.equal(envelope.sig, ACTION_SIG);
  assert.ok(!JSON.stringify(envelope).includes(KEY), 'the pairing key must not be on the wire');
});

test('open returns the content of a valid envelope', async () => {
  const content = await openRemoteMessage(KEY, 'state-update', { v: 2, body: STATE_BODY, sig: STATE_SIG });
  assert.deepEqual(content, { state: { bankCount: 3 }, timestamp: 1700000000000 });
});

test('open returns null when v is not 2', async () => {
  for (const v of [1, '2', undefined, 3]) {
    assert.equal(await openRemoteMessage(KEY, 'state-update', { v, body: STATE_BODY, sig: STATE_SIG }), null, `v ${String(v)}`);
  }
  assert.equal(await openRemoteMessage(KEY, 'state-update', { body: STATE_BODY, sig: STATE_SIG }), null);
});

test('open returns null for non-string fields', async () => {
  assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, body: JSON.parse(STATE_BODY), sig: STATE_SIG }), null);
  assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, body: STATE_BODY, sig: 7 }), null);
  assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, sig: STATE_SIG }), null);
});

test('open returns null for a bad sig', async () => {
  assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, body: STATE_BODY, sig: ACTION_SIG }), null);
});

test('open returns null for the other event (domain separation)', async () => {
  assert.equal(await openRemoteMessage(KEY, 'action', { v: 2, body: STATE_BODY, sig: STATE_SIG }), null);
});

test('open returns null for an unparseable body under a valid sig', async () => {
  const body = '{"state": not json';
  const sig = await signRemote(KEY, 'state-update', body);
  assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, body, sig }), null);
});

test('open returns null when a validly signed body is not a JSON object', async () => {
  for (const body of ['"text"', '[1,2]', 'null', '42']) {
    const sig = await signRemote(KEY, 'state-update', body);
    assert.equal(await openRemoteMessage(KEY, 'state-update', { v: 2, body, sig }), null, `body ${body}`);
  }
});

test('open returns null for non-object payloads', async () => {
  for (const payload of [null, undefined, 'v2', 42, true, [2, STATE_BODY, STATE_SIG]]) {
    assert.equal(await openRemoteMessage(KEY, 'state-update', payload), null, `payload ${JSON.stringify(payload)}`);
  }
});
