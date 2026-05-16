import { ControlButton } from './ControlButton';
import { Section } from './Section';
import type { RemoteAction } from '../types';

interface MissionsSectionProps {
  activeMission?: 'morning' | 'evening' | 'none';
  missionTimeRemaining?: string;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MissionsSection({ activeMission, loadingActions, dispatchAction }: MissionsSectionProps) {
  // Determine which mission to target for the shared buttons. 
  // Fallback to 'morning' if none is active to prevent errors, though they usually won't be clicked if inactive.
  const targetPhase = (activeMission && activeMission !== 'none') ? activeMission : 'morning';

  return (
    <Section title="Missions">
      <div className="flex flex-col gap-4">
        
        {/* Start Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <ControlButton 
            icon={<span className="text-xl">☀️</span>} 
            label="Start Morning" 
            loading={loadingActions.has('m-start')}
            onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' }, 'm-start')} 
            bg="bg-amber-50"
            border="border-amber-100"
            className="h-16 rounded-xl"
          />
          <ControlButton 
            icon={<span className="text-xl">🌙</span>} 
            label="Start Evening" 
            loading={loadingActions.has('e-start')}
            onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' }, 'e-start')} 
            bg="bg-indigo-50"
            border="border-indigo-100"
            className="h-16 rounded-xl"
          />
        </div>

        {/* Time Adjustments (Shared) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            <ControlButton icon={<span className="text-[10px] font-bold">+1m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 1 }, 'm-time-1')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">+5m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 5 }, 'm-time-5')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">+10m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 10 }, 'm-time-10')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <ControlButton icon={<span className="text-[10px] font-bold">-1m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -1 }, 'e-time-1')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">-5m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -5 }, 'e-time-5')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">-10m</span>} label="" disabled={!activeMission || activeMission === 'none'} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -10 }, 'e-time-10')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
          </div>
        </div>

        {/* Shared Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <ControlButton 
            icon={<span className="text-xl">⏹️</span>} 
            label="Stop" 
            disabled={!activeMission || activeMission === 'none'}
            loading={loadingActions.has('shared-stop')}
            onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: targetPhase }, 'shared-stop')} 
            bg="bg-slate-100"
            className="h-16 rounded-xl"
          />
          <ControlButton 
            icon={<span className="text-xl">🔄</span>} 
            label="Reset" 
            disabled={!activeMission || activeMission === 'none'}
            loading={loadingActions.has('shared-reset')}
            onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: targetPhase }, 'shared-reset')} 
            bg="bg-slate-100"
            className="h-16 rounded-xl"
          />
          <ControlButton 
            icon={<span className="text-xl">😱</span>} 
            label="Whine" 
            disabled={!activeMission || activeMission === 'none'}
            loading={loadingActions.has('shared-whine')}
            onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: targetPhase, lockedFromUI: true }, 'shared-whine')} 
            bg="bg-red-50"
            className="h-16 rounded-xl"
          />
        </div>

      </div>
    </Section>
  );
}
