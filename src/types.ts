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

export interface BroadcastPayload {
  key: string;
  msgId: string;
  timestamp: number;
  action: RemoteAction;
}
