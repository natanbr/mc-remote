/**
 * Pairing data from the QR link and localStorage, and the protocol mode that goes with it.
 * v2 desktops put the pairing in the URL fragment (never sent to the server, so never in
 * Vercel's request logs); old QR codes put it in the query string.
 */
export type ProtocolMode = 'legacy' | 'v2';

export interface Pairing {
  roomId: string;
  secretKey: string;
  mode: ProtocolMode;
}

export interface UrlParts {
  hash: string;
  search: string;
}

export type PairingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const ROOM = 'mc_room';
const KEY = 'mc_key';
// '2' = v2 mode. Absent = legacy mode: paired from an old QR code, the host may still speak v1.
const PROTO = 'mc_proto';

function paramsOf(part: string): URLSearchParams {
  return new URLSearchParams(part.replace(/^[#?]/, ''));
}

function pairingFrom(params: URLSearchParams): Pairing | null {
  const roomId = params.get('room');
  const secretKey = params.get('key');
  if (!roomId || !secretKey) return null;
  return { roomId, secretKey, mode: params.get('v') === '2' ? 'v2' : 'legacy' };
}

/** The fragment first, then the query string. Null unless both room and key are present. */
export function parsePairingParams(url: UrlParts): Pairing | null {
  return pairingFrom(paramsOf(url.hash)) ?? pairingFrom(paramsOf(url.search));
}

/** True when the address bar holds a room or a key, even an incomplete pair: wipe it. */
export function urlCarriesPairingParams(url: UrlParts): boolean {
  return [url.hash, url.search].some((part) => {
    const params = paramsOf(part);
    return params.has('room') || params.has('key');
  });
}

/**
 * A pairing in the URL replaces the stored one, mode included (a new pairing never inherits the
 * old pairing's upgrade). Otherwise the stored pairing is used.
 */
export function resolvePairing(url: UrlParts, storage: PairingStorage): { pairing: Pairing | null; scrubUrl: boolean } {
  const scrubUrl = urlCarriesPairingParams(url);
  const fromUrl = parsePairingParams(url);
  if (fromUrl) {
    storage.setItem(ROOM, fromUrl.roomId);
    storage.setItem(KEY, fromUrl.secretKey);
    if (fromUrl.mode === 'v2') storage.setItem(PROTO, '2');
    else storage.removeItem(PROTO);
    return { pairing: fromUrl, scrubUrl };
  }
  const roomId = storage.getItem(ROOM);
  const secretKey = storage.getItem(KEY);
  if (!roomId || !secretKey) return { pairing: null, scrubUrl };
  return { pairing: { roomId, secretKey, mode: storage.getItem(PROTO) === '2' ? 'v2' : 'legacy' }, scrubUrl };
}

/** The host sent a verified signed state, so it speaks v2: stay in v2 mode for good. */
export function markUpgradedToV2(storage: PairingStorage): void {
  storage.setItem(PROTO, '2');
}
