import type { ActionContent, BroadcastPayload, LegacyActionPayload, RemoteAction, SyncRequestAction } from '../types.ts';
import type { ProtocolMode } from './pairing.ts';
import { isRecord, openRemoteMessage, sealRemoteMessage } from './remoteAuth.ts';

/**
 * Protocol rules that depend on the mode (see pairing.ts): what to send, and which incoming
 * state-updates to accept. Pure apart from WebCrypto, so the hook stays thin and this is testable.
 */

export type StateCandidate =
  | { kind: 'signed'; state: Record<string, unknown>; timestamp: number }
  | { kind: 'legacy'; state: Record<string, unknown> };

export type StateDecision =
  | { accept: false }
  | { accept: true; state: Record<string, unknown>; acceptedTimestamp: number | null; upgradeToV2: boolean };

const REJECT: StateDecision = { accept: false };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The async half: verify and parse, independent of the mode. The caller decides with
 * `decideStateUpdate` AFTER the await, against the mode and last timestamp as they are then —
 * two messages can finish verifying out of order, and the mode can flip in between.
 */
export async function classifyStateUpdate(payload: unknown, secretKey: string): Promise<StateCandidate | null> {
  if (!isRecord(payload)) return null;
  if (payload.v === 2) {
    const content = await openRemoteMessage(secretKey, 'state-update', payload);
    if (!content || !isRecord(content.state) || !isFiniteNumber(content.timestamp)) return null;
    return { kind: 'signed', state: content.state, timestamp: content.timestamp };
  }
  // LEGACY (protocol v1): { key, state, timestamp }. Remove once the desktop v2 release is installed everywhere.
  if (payload.key === secretKey && isRecord(payload.state)) return { kind: 'legacy', state: payload.state };
  return null;
}

/**
 * Signed states must be strictly newer than the last accepted one (defeats replaying an old
 * signed state). A verified signed state in legacy mode proves the host speaks v2: upgrade.
 * Legacy states are accepted in legacy mode only, and do not move the timestamp (as in v1).
 */
export function decideStateUpdate(candidate: StateCandidate | null, mode: ProtocolMode, lastAcceptedTimestamp: number): StateDecision {
  if (!candidate) return REJECT;
  if (candidate.kind === 'legacy') {
    return mode === 'legacy' ? { accept: true, state: candidate.state, acceptedTimestamp: null, upgradeToV2: false } : REJECT;
  }
  if (candidate.timestamp <= lastAcceptedTimestamp) return REJECT;
  return { accept: true, state: candidate.state, acceptedTimestamp: candidate.timestamp, upgradeToV2: mode === 'legacy' };
}

export function newActionContent(action: RemoteAction | SyncRequestAction, now = Date.now(), msgIdPrefix = ''): ActionContent {
  return { action, msgId: `${msgIdPrefix}${now}-${Math.random().toString(36).slice(2, 9)}`, timestamp: now };
}

// LEGACY (protocol v1): the pairing key travels in plain text. Remove once the desktop v2 release is installed everywhere.
function legacyActionPayload(secretKey: string, content: ActionContent): LegacyActionPayload {
  return { key: secretKey, ...content };
}

export async function buildActionPayload(mode: ProtocolMode, secretKey: string, content: ActionContent): Promise<BroadcastPayload> {
  return mode === 'v2' ? sealRemoteMessage(secretKey, 'action', content) : legacyActionPayload(secretKey, content);
}

/**
 * Sent on every subscribe. Legacy mode sends the signed request first, then the unsigned one:
 * a v1 desktop answers only the unsigned one, a v2 desktop rejects it and answers the signed one.
 */
export async function buildSyncRequests(mode: ProtocolMode, secretKey: string, now = Date.now()): Promise<BroadcastPayload[]> {
  const syncContent = () => newActionContent({ type: 'SYNC_REQUEST' }, now, 'sync-');
  const signed = await sealRemoteMessage(secretKey, 'action', syncContent());
  return mode === 'v2' ? [signed] : [signed, legacyActionPayload(secretKey, syncContent())];
}

/**
 * Runs tasks one after another and settles their promises in call order. Two WebCrypto signs are
 * not guaranteed to finish in call order, and a reordered pair of SNAKE_DIR presses steers the
 * snake the wrong way. Only the signing is queued: attach the send with `.then` straight after
 * the call, so a press never waits for the previous message's acknowledgement.
 */
export function createSerialQueue(): <T>(task: () => T | Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => T | Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
}
