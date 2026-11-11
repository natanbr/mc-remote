import { Section } from './Section';
import { MissionCard } from './MissionCard';
import { useMissionCountdown } from './useMissionCountdown';
import type { RemoteAction, RemoteMission } from '../types';

interface MissionsSectionProps {
  connected: boolean;
  activeMission?: 'morning' | 'evening' | 'none';
  missionStartedAt?: string | null;
  missionDurationMins?: number | null;
  whiningDetected?: boolean;
  missionTasks?: Array<{ id: string; label: string; icon: string; completed: boolean; locked: boolean }>;
  missions?: RemoteMission[];
  lastCompletedOrFailedMorningDate?: string | null;
  lastCompletedOrFailedEveningDate?: string | null;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MissionsSection({
  activeMission,
  connected,
  missionStartedAt,
  missionDurationMins,
  whiningDetected,
  missionTasks,
  missions,
  lastCompletedOrFailedMorningDate,
  lastCompletedOrFailedEveningDate,
  loadingActions,
  dispatchAction,
}: MissionsSectionProps) {
  
  // Find detailed missions or build fallbacks
  const morningMissionData = missions?.find(m => m.phase === 'morning') ?? {
    phase: 'morning' as const,
    active: activeMission === 'morning',
    startsAt: '06:00',
    startedAt: activeMission === 'morning' ? missionStartedAt : null,
    durationMins: activeMission === 'morning' ? missionDurationMins : null,
    whiningDetected: activeMission === 'morning' ? !!whiningDetected : false,
    tasks: activeMission === 'morning' ? (missionTasks ?? []) : [],
  };

  const eveningMissionData = missions?.find(m => m.phase === 'evening') ?? {
    phase: 'evening' as const,
    active: activeMission === 'evening',
    startsAt: '19:00',
    startedAt: activeMission === 'evening' ? missionStartedAt : null,
    durationMins: activeMission === 'evening' ? missionDurationMins : null,
    whiningDetected: activeMission === 'evening' ? !!whiningDetected : false,
    tasks: activeMission === 'evening' ? (missionTasks ?? []) : [],
  };

  const morningCountdown = useMissionCountdown(morningMissionData.startedAt, morningMissionData.durationMins);
  const eveningCountdown = useMissionCountdown(eveningMissionData.startedAt, eveningMissionData.durationMins);

  // An outcome date includes failed attempts; it labels history without restricting another start.
  const todayStr = new Date().toLocaleDateString('sv');
  const morningAttemptedToday = lastCompletedOrFailedMorningDate === todayStr;
  const eveningAttemptedToday = lastCompletedOrFailedEveningDate === todayStr;

  const isAnyActive = morningMissionData.active || eveningMissionData.active;

  return (
    <Section title="Missions">
      <div className="flex flex-col gap-4">
        {(!isAnyActive || morningMissionData.active) && (
          <MissionCard
            mission={morningMissionData}
            countdown={morningCountdown}
            attemptedToday={morningAttemptedToday}
            activeMission={activeMission}
            connected={connected}
            loadingActions={loadingActions}
            dispatchAction={dispatchAction}
          />
        )}
        {(!isAnyActive || eveningMissionData.active) && (
          <MissionCard
            mission={eveningMissionData}
            countdown={eveningCountdown}
            attemptedToday={eveningAttemptedToday}
            activeMission={activeMission}
            connected={connected}
            loadingActions={loadingActions}
            dispatchAction={dispatchAction}
          />
        )}
      </div>
    </Section>
  );
}
