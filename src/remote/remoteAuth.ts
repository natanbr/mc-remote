import type { SignedEnvelope } from '../types.ts';

/**
 * Protocol v2 message authentication (the desktop's electron/remote-bridge.ts does the same).
 * sig = base64url(HMAC-SHA256(key = pairing key, message = event + "\n" + body)), no padding.
 * The event name is signed so a captured state-update can never be replayed as an action.
 * The body is signed as the exact string sent: the transport re-encodes JSON objects, so a
 * received object must never be re-serialized to verify it.
 */
export type RemoteEvent = 'action' | 'state-update';

const encoder = new TextEncoder();

/** WebCrypto exists only in a secure context (HTTPS or localhost), not on http://192.168.x.x. */
export function hasWebCrypto(): boolean {
  return globalThis.crypto?.subtle !== undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// One pairing key at a time, so the cache holds one entry.
let cachedKey: { secretKey: string; key: Promise<CryptoKey> } | null = null;

export function getHmacKey(secretKey: string): Promise<CryptoKey> {
  if (cachedKey?.secretKey !== secretKey) {
    const key = crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const entry = { secretKey, key };
    cachedKey = entry;
    key.catch(() => {
      if (cachedKey === entry) cachedKey = null;
    });
  }
  return cachedKey.key;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signRemote(secretKey: string, event: RemoteEvent, body: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', await getHmacKey(secretKey), encoder.encode(`${event}\n${body}`));
  return base64UrlEncode(new Uint8Array(mac));
}

/** Length check first, then a comparison whose time does not depend on where the strings differ. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyRemote(secretKey: string, event: RemoteEvent, body: string, sig: unknown): Promise<boolean> {
  if (typeof sig !== 'string') return false;
  return timingSafeEqual(await signRemote(secretKey, event, body), sig);
}

export async function sealRemoteMessage(secretKey: string, event: RemoteEvent, content: object): Promise<SignedEnvelope> {
  const body = JSON.stringify(content);
  return { v: 2, body, sig: await signRemote(secretKey, event, body) };
}

/** The parsed body of a verified envelope, or null. Verifies before it parses. */
export async function openRemoteMessage(secretKey: string, event: RemoteEvent, payload: unknown): Promise<Record<string, unknown> | null> {
  if (!isRecord(payload) || payload.v !== 2 || typeof payload.body !== 'string') return null;
  if (!(await verifyRemote(secretKey, event, payload.body, payload.sig))) return null;
  let content: unknown;
  try {
    content = JSON.parse(payload.body);
  } catch {
    return null;
  }
  return isRecord(content) ? content : null;
}
