export type ConnectionStatus = 'connecting' | 'connected' | 'offline';

export interface RemoteConfig {
  roomId: string;
  secretKey: string;
}

export type ActionType = 
  | 'ADD_TOKENS'
  | 'REMOVE_TOKEN'
  | 'ADD_RESPONSIBILITY_POINT'
  | 'GRANT_GAME_TOKEN'
  | 'CONSUME_GAME_TOKEN'
  | 'RESET_GAME_TOKENS'
  | 'SET_ACTIVE_MISSION'
  | 'ADJUST_MISSION_END'
  | 'RESET_MISSION'
  | 'CANCEL_MISSION'
  | 'TOGGLE_WHINING'
  | 'TRIGGER_ANIMATION'
  | 'CHEAT_ATTEMPT'
  | 'RESET_RESPONSIBILITY'
  | 'SET_PRIVILEGE_STATUS'
  | 'SET_MOOD_WIND'
  | 'ADJUST_BEHAVIOR_PROGRESS'
  | 'ADJUST_SHIELD'
  | 'SNAKE_DIR'
  | 'COMPLETE_TASK';

export interface PrivilegeCard {
  id: string;
  label: string;
  icon: string;
  status: 'active' | 'suspended' | 'locked';
  suspendedUntil: string | null;
}

export interface RemoteAction {
  type: ActionType;
  [key: string]: unknown; // Payload fields like amount, taskId, etc.
}

/** Sent on subscribe so the host broadcasts its current state. Never dispatched from the UI. */
export interface SyncRequestAction {
  type: 'SYNC_REQUEST';
}

/** What an `action` message carries: the signed body in v2, the fields beside `key` in legacy. */
export interface ActionContent {
  action: RemoteAction | SyncRequestAction;
  msgId: string;
  timestamp: number;
}

/**
 * Protocol v2 wire payload, both events and both directions. `body` is the JSON string that
 * `sig` covers (HMAC-SHA256 keyed by the pairing key); the key itself is never sent.
 */
export interface SignedEnvelope {
  v: 2;
  body: string;
  sig: string;
}

/**
 * LEGACY protocol v1 action payload: carries the pairing key in plain text.
 * Remove once the desktop v2 release is installed everywhere.
 */
export interface LegacyActionPayload extends ActionContent {
  key: string;
}

/** Payload of a broadcast `action` event. */
export type BroadcastPayload = SignedEnvelope | LegacyActionPayload;

export interface RemoteMission {
  phase: 'morning' | 'evening';
  active: boolean;
  startsAt: string;
  startedAt?: string | null;
  durationMins?: number | null;
  whiningDetected: boolean;
  tasks: Array<{
    id: string;
    label: string;
    icon: string;
    completed: boolean;
    locked: boolean;
  }>;
}
