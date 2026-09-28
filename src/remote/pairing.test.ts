import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pairingModule from './pairing.ts';
import {
  pairingToApply,
  parsePairingParams,
  redactRoomId,
  resolvePairing,
  urlCarriesPairingParams,
  type Pairing,
  type PairingStorage,
} from './pairing.ts';

function fakeStorage(initial: Record<string, string> = {}): PairingStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

const url = (hash = '', search = '') => ({ hash, search });
const ok = (roomId: string, secretKey: string, mode: Pairing['mode']) => ({ status: 'ok', pairing: { roomId, secretKey, mode } });

// --- parsing -----------------------------------------------------------------------------

test('a fragment pairing is v2 whether v is absent or exactly "2"', () => {
  assert.deepEqual(parsePairingParams(url('#room=R1&key=K1&v=2')), ok('R1', 'K1', 'v2'));
  assert.deepEqual(parsePairingParams(url('#room=R1&key=K1')), ok('R1', 'K1', 'v2'), 'only v2 desktops write the fragment');
});

test('a fragment pairing with any other v is refused', () => {
  for (const v of ['2?utm=x', '3', '1', '']) {
    assert.deepEqual(parsePairingParams(url(`#room=R1&key=K1&v=${v}`)), { status: 'refused' }, `v=${v}`);
  }
});

test('a query-string pairing (old QR codes) is always legacy, whatever v says', () => {
  assert.deepEqual(parsePairingParams(url('', '?room=R2&key=K2')), ok('R2', 'K2', 'legacy'));
  assert.deepEqual(parsePairingParams(url('', '?room=R2&key=K2&v=2')), ok('R2', 'K2', 'legacy'));
});

test('parse prefers the fragment over the query string', () => {
  assert.deepEqual(parsePairingParams(url('#room=F&key=FK&v=2', '?room=Q&key=QK')), ok('F', 'FK', 'v2'));
});

test('parse returns nothing when room or key is missing', () => {
  for (const [hash, search] of [
    ['', ''],
    ['#room=R', ''],
    ['#key=K&v=2', ''],
    ['', '?room=R'],
    ['', '?key=K'],
    ['#room=&key=K', ''],
    ['#room=R&key=', ''],
    ['#', '?'],
  ]) {
    assert.deepEqual(parsePairingParams(url(hash, search)), { status: 'absent' }, `hash ${hash} search ${search}`);
  }
});

test('the URL is flagged for wiping whenever it carries a room or a key, in either place', () => {
  assert.equal(urlCarriesPairingParams(url('#room=R&key=K&v=2')), true);
  assert.equal(urlCarriesPairingParams(url('', '?room=R&key=K')), true);
  assert.equal(urlCarriesPairingParams(url('#key=K')), true, 'a truncated link still leaks the key');
  assert.equal(urlCarriesPairingParams(url('', '?room=R')), true);
  assert.equal(urlCarriesPairingParams(url('', '')), false);
  assert.equal(urlCarriesPairingParams(url('#top', '?utm_source=x')), false);
});

// --- resolving against storage -----------------------------------------------------------

test('a v2 pairing from the URL is stored with mc_proto = "2"', () => {
  const storage = fakeStorage();
  const result = resolvePairing(url('#room=R&key=K&v=2'), storage);
  assert.deepEqual(result, { pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' }, scrubUrl: true, warning: null });
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'R', mc_key: 'K', mc_proto: '2' });
});

test('a refused fragment pairing is not stored, is wiped, and warns without the key', () => {
  const storage = fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: '2' });
  const result = resolvePairing(url('#room=NEWROOM&key=DISTINCTIVEKEY&v=3'), storage);
  assert.deepEqual(result.pairing, { roomId: 'R', secretKey: 'K', mode: 'v2' }, 'the stored pairing stays');
  assert.equal(result.scrubUrl, true);
  assert.equal(typeof result.warning, 'string');
  assert.ok(!result.warning?.includes('DISTINCTIVEKEY') && !result.warning?.includes('NEWROOM'));
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'R', mc_key: 'K', mc_proto: '2' });
});

test('a legacy link replaces a stored legacy pairing', () => {
  const storage = fakeStorage({ mc_room: 'OLD', mc_key: 'OLDK' });
  const result = resolvePairing(url('', '?room=R&key=K'), storage);
  assert.deepEqual(result, { pairing: { roomId: 'R', secretKey: 'K', mode: 'legacy' }, scrubUrl: true, warning: null });
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'R', mc_key: 'K' });
});

test('a legacy link never replaces a stored v2 pairing (a saved old link must not undo the re-scan)', () => {
  const storage = fakeStorage({ mc_room: 'V2ROOM', mc_key: 'V2KEY', mc_proto: '2' });
  const result = resolvePairing(url('', '?room=OLDROOM&key=OLDKEY'), storage);
  assert.deepEqual(result.pairing, { roomId: 'V2ROOM', secretKey: 'V2KEY', mode: 'v2' });
  assert.equal(result.scrubUrl, true);
  assert.equal(typeof result.warning, 'string');
  assert.ok(!result.warning?.includes('OLDKEY'));
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'V2ROOM', mc_key: 'V2KEY', mc_proto: '2' });
});

test('without a URL pairing the stored pairing and mode are used', () => {
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: '2' })), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' },
    scrubUrl: false,
    warning: null,
  });
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K' })), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'legacy' },
    scrubUrl: false,
    warning: null,
  });
  assert.equal(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: 'v2' })).pairing?.mode, 'legacy',
    'only the exact value "2" means v2');
});

test('nothing stored and nothing in the URL means not paired', () => {
  assert.deepEqual(resolvePairing(url(), fakeStorage()), { pairing: null, scrubUrl: false, warning: null });
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R' })), { pairing: null, scrubUrl: false, warning: null });
});

test('a truncated pairing link is wiped and does not replace the stored pairing', () => {
  const storage = fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: '2' });
  assert.deepEqual(resolvePairing(url('#key=LEAKED'), storage), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' },
    scrubUrl: true,
    warning: null,
  });
  assert.equal(storage.data.get('mc_key'), 'K');
});

test('the mode comes only from the pairing link: there is no automatic upgrade', () => {
  assert.equal('markUpgradedToV2' in pairingModule, false);
});

// --- same-tab re-pairing (hashchange) ----------------------------------------------------

test('a changed pairing is applied: connect to its room', () => {
  const current = { roomId: 'A', secretKey: 'KA', mode: 'v2' } as const;
  const next = { roomId: 'B', secretKey: 'KB', mode: 'v2' } as const;
  assert.deepEqual(pairingToApply(current, next), next);
  assert.deepEqual(pairingToApply(null, next), next, 'first pairing on mount');
  assert.deepEqual(pairingToApply(current, { ...current, secretKey: 'K2' }), { ...current, secretKey: 'K2' });
  assert.deepEqual(pairingToApply(current, { ...current, mode: 'legacy' }), { ...current, mode: 'legacy' });
});

test('an unchanged or missing pairing is not re-applied (no reconnect)', () => {
  const current = { roomId: 'A', secretKey: 'KA', mode: 'v2' } as const;
  assert.equal(pairingToApply(current, { ...current }), null);
  assert.equal(pairingToApply(current, null), null);
  assert.equal(pairingToApply(null, null), null);
});

// --- logging -----------------------------------------------------------------------------

test('redactRoomId shortens every occurrence of the room id to its first 8 characters', () => {
  const room = '0123456789abcdef-room';
  assert.equal(
    redactRoomId(`join failed: remote-control:${room}, topic remote-control:${room}`, room),
    'join failed: remote-control:01234567…, topic remote-control:01234567…',
  );
  assert.equal(redactRoomId('socket closed: 1000', room), 'socket closed: 1000');
  assert.equal(redactRoomId('unchanged', ''), 'unchanged', 'an empty room id must not split the message');
});
