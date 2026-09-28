/**
 * Pairing data from the QR link and localStorage, and the protocol mode that goes with it. The
 * mode comes only from the link: v2 desktops put the pairing in the URL fragment (never sent to
 * the server, so never in Vercel's request logs); old QR codes put it in the query string.
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

export type UrlPairing = { status: 'absent' } | { status: 'ok'; pairing: Pairing } | { status: 'refused' };

const ROOM = 'mc_room';
const KEY = 'mc_key';
// '2' = v2 mode (paired from a fragment link). Absent = legacy mode (paired from an old QR code).
const PROTO = 'mc_proto';

const REFUSED_VERSION =
  '[Remote] Ignored a pairing link with an unknown protocol version. Scan the QR code in Mission Control again.';
const REFUSED_DOWNGRADE =
  '[Remote] Ignored an old pairing link: this phone is already paired with the updated Mission Control.';

function paramsOf(part: string): URLSearchParams {
  return new URLSearchParams(part.replace(/^[#?]/, ''));
}

function roomAndKey(params: URLSearchParams): { roomId: string; secretKey: string } | null {
  const roomId = params.get('room');
  const secretKey = params.get('key');
  return roomId && secretKey ? { roomId, secretKey } : null;
}

/**
 * The fragment first, then the query string. Only v2 desktops write the fragment, so a fragment
 * pairing is v2 when `v` is absent or exactly '2' and refused for any other `v` (a damaged link
 * or a future version must not fall back to sending the key). A query-string pairing is always
 * legacy.
 */
export function parsePairingParams(url: UrlParts): UrlPairing {
  const fragment = paramsOf(url.hash);
  const fromFragment = roomAndKey(fragment);
  if (fromFragment) {
    const v = fragment.get('v');
    return v === null || v === '2' ? { status: 'ok', pairing: { ...fromFragment, mode: 'v2' } } : { status: 'refused' };
  }
  const fromQuery = roomAndKey(paramsOf(url.search));
  return fromQuery ? { status: 'ok', pairing: { ...fromQuery, mode: 'legacy' } } : { status: 'absent' };
}

/** True when the address bar holds a room or a key, even an incomplete pair: wipe it. */
export function urlCarriesPairingParams(url: UrlParts): boolean {
  return [url.hash, url.search].some((part) => {
    const params = paramsOf(part);
    return params.has('room') || params.has('key');
  });
}

function storedPairing(storage: PairingStorage): Pairing | null {
  const roomId = storage.getItem(ROOM);
  const secretKey = storage.getItem(KEY);
  if (!roomId || !secretKey) return null;
  return { roomId, secretKey, mode: storage.getItem(PROTO) === '2' ? 'v2' : 'legacy' };
}

/**
 * A pairing in the URL replaces the stored one, mode included, except that a legacy link never
 * replaces a v2 pairing (a saved old link must not undo the re-scan). `warning` never contains the
 * key or the room id.
 */
export function resolvePairing(
  url: UrlParts,
  storage: PairingStorage,
): { pairing: Pairing | null; scrubUrl: boolean; warning: string | null } {
  const scrubUrl = urlCarriesPairingParams(url);
  const stored = storedPairing(storage);
  const fromUrl = parsePairingParams(url);
  if (fromUrl.status === 'refused') return { pairing: stored, scrubUrl, warning: REFUSED_VERSION };
  if (fromUrl.status === 'absent') return { pairing: stored, scrubUrl, warning: null };
  if (fromUrl.pairing.mode === 'legacy' && stored?.mode === 'v2') return { pairing: stored, scrubUrl, warning: REFUSED_DOWNGRADE };

  storage.setItem(ROOM, fromUrl.pairing.roomId);
  storage.setItem(KEY, fromUrl.pairing.secretKey);
  if (fromUrl.pairing.mode === 'v2') storage.setItem(PROTO, '2');
  else storage.removeItem(PROTO);
  return { pairing: fromUrl.pairing, scrubUrl, warning: null };
}

/** The pairing to connect to when it differs from the current one (mount or a same-tab link), else null. */
export function pairingToApply(current: Pairing | null, resolved: Pairing | null): Pairing | null {
  if (!resolved) return null;
  const unchanged =
    current !== null &&
    current.roomId === resolved.roomId &&
    current.secretKey === resolved.secretKey &&
    current.mode === resolved.mode;
  return unchanged ? null : resolved;
}

/** Shortens the room id to its first 8 characters wherever it appears (as the desktop logs it). */
export function redactRoomId(message: string, roomId: string): string {
  if (!roomId) return message;
  return message.split(roomId).join(`${roomId.slice(0, 8)}…`);
}
