import type { ActionContent, BroadcastPayload, LegacyActionPayload, RemoteAction, SyncRequestAction } from '../types.ts';
import type { ProtocolMode } from './pairing.ts';
import { isRecord, openRemoteMessage, sealRemoteMessage } from './remoteAuth.ts';

/**
 * Protocol rules that depend on the mode (see pairing.ts): what to send, and which incoming
 * state-updates to accept. The mode comes only from the pairing link: legacy mode is the v1
 * phone exactly, v2 mode is signed only. Pure apart from WebCrypto, so this is testable.
 */

export type StateCandidate =
  | { kind: 'signed'; state: Record<string, unknown>; timestamp: number }
  | { kind: 'legacy'; state: Record<string, unknown> };

/** `clockSkewMs` (now - timestamp) is set only when a verified, newer state was refused for skew alone. */
export type StateDecision =
  | { accept: false; clockSkewMs?: number }
  | { accept: true; state: Record<string, unknown>; acceptedTimestamp: number | null };

const REJECT: StateDecision = { accept: false };

/**
 * How far a signed state's timestamp may be from the phone's clock. Genuine states arrive in real
 * time (the desktop broadcasts on change and answers SYNC_REQUEST). Without this bound the
 * "strictly newer" rule lasts one page session: after a reload a signed state recorded days ago
 * would be accepted.
 *
 * Mirrors the desktop's MAX_ACTION_AGE_MS (60 s, gcal-simplified electron/remote-bridge.ts), which
 * silently drops any action more than 60 s off its clock, and must stay at or below it: a state
 * accepted here shows the phone as live, so its presses must be accepted there. The phone sees the
 * clock difference less the state's network delay, the desktop sees it plus the action's delay;
 * the 5 s margin covers both hops.
 */
export const MAX_STATE_SKEW_MS = 55_000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The async half: verify and parse, for one mode only. In v2 mode an attacker-supplied `key` is
 * never even compared; in legacy mode a signed state is not verified (the key is public there).
 * The caller decides with `decideStateUpdate` AFTER the await, against the mode and last
 * timestamp as they are then: two messages can finish verifying out of order.
 */
export async function classifyStateUpdate(payload: unknown, secretKey: string, mode: ProtocolMode): Promise<StateCandidate | null> {
  if (!isRecord(payload)) return null;
  if (mode === 'v2') {
    const content = await openRemoteMessage(secretKey, 'state-update', payload);
    if (!content || !isRecord(content.state) || !isFiniteNumber(content.timestamp)) return null;
    return { kind: 'signed', state: content.state, timestamp: content.timestamp };
  }
  // LEGACY (protocol v1): { key, state, timestamp }. Remove once the desktop v2 release is installed everywhere.
  if (payload.key === secretKey && isRecord(payload.state)) return { kind: 'legacy', state: payload.state };
  return null;
}

/**
 * Each kind is accepted in its own mode only. Signed states must be strictly newer than the last
 * accepted one and within MAX_STATE_SKEW_MS of `now` (defeats replaying an old signed state);
 * the order of checks is what makes `clockSkewMs` mean "refused only for skew". Legacy states
 * do not move the timestamp (as in v1).
 */
export function decideStateUpdate(
  candidate: StateCandidate | null,
  mode: ProtocolMode,
  lastAcceptedTimestamp: number,
  now: number,
): StateDecision {
  if (!candidate) return REJECT;
  if (candidate.kind === 'legacy') {
    return mode === 'legacy' ? { accept: true, state: candidate.state, acceptedTimestamp: null } : REJECT;
  }
  if (mode !== 'v2' || candidate.timestamp <= lastAcceptedTimestamp) return REJECT;
  const clockSkewMs = now - candidate.timestamp;
  if (Math.abs(clockSkewMs) > MAX_STATE_SKEW_MS) return { accept: false, clockSkewMs };
  return { accept: true, state: candidate.state, acceptedTimestamp: candidate.timestamp };
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

/** Sent on every subscribe: one request, in the pairing's own protocol. */
export async function buildSyncRequests(mode: ProtocolMode, secretKey: string, now = Date.now()): Promise<BroadcastPayload[]> {
  const content = newActionContent({ type: 'SYNC_REQUEST' }, now, 'sync-');
  return [await buildActionPayload(mode, secretKey, content)];
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
    // No argument for the task, and the tail keeps no result (a legacy payload holds the key).
    const result = tail.then(() => task());
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}
