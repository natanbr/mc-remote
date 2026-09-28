import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  markUpgradedToV2,
  parsePairingParams,
  resolvePairing,
  urlCarriesPairingParams,
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

test('parse reads the pairing from the fragment and carries v=2', () => {
  assert.deepEqual(parsePairingParams(url('#room=R1&key=K1&v=2')), { roomId: 'R1', secretKey: 'K1', mode: 'v2' });
});

test('parse treats a fragment without v=2 as legacy', () => {
  assert.deepEqual(parsePairingParams(url('#room=R1&key=K1')), { roomId: 'R1', secretKey: 'K1', mode: 'legacy' });
  assert.deepEqual(parsePairingParams(url('#room=R1&key=K1&v=1')), { roomId: 'R1', secretKey: 'K1', mode: 'legacy' });
});

test('parse falls back to the query string (old QR codes)', () => {
  assert.deepEqual(parsePairingParams(url('', '?room=R2&key=K2')), { roomId: 'R2', secretKey: 'K2', mode: 'legacy' });
  assert.deepEqual(parsePairingParams(url('', '?room=R2&key=K2&v=2')), { roomId: 'R2', secretKey: 'K2', mode: 'v2' });
});

test('parse prefers the fragment over the query string', () => {
  assert.deepEqual(parsePairingParams(url('#room=F&key=FK&v=2', '?room=Q&key=QK')), { roomId: 'F', secretKey: 'FK', mode: 'v2' });
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
    assert.equal(parsePairingParams(url(hash, search)), null, `hash ${hash} search ${search}`);
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

test('a v2 pairing from the URL is stored with mc_proto = "2"', () => {
  const storage = fakeStorage();
  const result = resolvePairing(url('#room=R&key=K&v=2'), storage);
  assert.deepEqual(result, { pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' }, scrubUrl: true });
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'R', mc_key: 'K', mc_proto: '2' });
});

test('a legacy pairing from the URL replaces the old pairing and clears mc_proto', () => {
  const storage = fakeStorage({ mc_room: 'OLD', mc_key: 'OLDK', mc_proto: '2' });
  const result = resolvePairing(url('', '?room=R&key=K'), storage);
  assert.deepEqual(result, { pairing: { roomId: 'R', secretKey: 'K', mode: 'legacy' }, scrubUrl: true });
  assert.deepEqual(Object.fromEntries(storage.data), { mc_room: 'R', mc_key: 'K' });
});

test('without a URL pairing the stored pairing and mode are used', () => {
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: '2' })), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' },
    scrubUrl: false,
  });
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K' })), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'legacy' },
    scrubUrl: false,
  });
  assert.equal(resolvePairing(url(), fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: 'v2' })).pairing?.mode, 'legacy',
    'only the exact value "2" means v2');
});

test('nothing stored and nothing in the URL means not paired', () => {
  assert.deepEqual(resolvePairing(url(), fakeStorage()), { pairing: null, scrubUrl: false });
  assert.deepEqual(resolvePairing(url(), fakeStorage({ mc_room: 'R' })), { pairing: null, scrubUrl: false });
});

test('a truncated pairing link is wiped and does not replace the stored pairing', () => {
  const storage = fakeStorage({ mc_room: 'R', mc_key: 'K', mc_proto: '2' });
  assert.deepEqual(resolvePairing(url('#key=LEAKED'), storage), {
    pairing: { roomId: 'R', secretKey: 'K', mode: 'v2' },
    scrubUrl: true,
  });
  assert.equal(storage.data.get('mc_key'), 'K');
});

test('the auto-upgrade persists v2 mode', () => {
  const storage = fakeStorage({ mc_room: 'R', mc_key: 'K' });
  markUpgradedToV2(storage);
  assert.equal(storage.data.get('mc_proto'), '2');
  assert.equal(resolvePairing(url(), storage).pairing?.mode, 'v2');
});
