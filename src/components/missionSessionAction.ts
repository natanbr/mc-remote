import type { RemoteAction, RemoteMission } from '../types.ts';

export interface MissionSessionInput {
  kind: 'start' | 'restart' | 'stop';
  phase: RemoteMission['phase'];
  activeMission: RemoteMission['phase'] | 'none' | undefined;
  connected: boolean;
  missionActive?: boolean;
  loadingActions: ReadonlySet<string>;
}

export function missionSessionAction(input: MissionSessionInput): RemoteAction | null {
  if (!input.connected || input.activeMission === undefined) return null;
  if ([...input.loadingActions].some(id => /^(morning|evening)-(start|restart|stop|reset)$/.test(id))) return null;

  if (input.kind === 'start') {
    return input.activeMission === 'none' ? { type: 'SET_ACTIVE_MISSION', phase: input.phase } : null;
  }
  if (input.kind === 'stop') {
    // The host permits Stop to recover a persisted active card with no global running phase.
    return input.activeMission === input.phase || (input.activeMission === 'none' && input.missionActive)
      ? { type: 'CANCEL_MISSION', missionPhase: input.phase }
      : null;
  }
  return input.activeMission === input.phase
    ? { type: 'RESET_MISSION_WITH_TIMER', missionPhase: input.phase }
    : null;
}
