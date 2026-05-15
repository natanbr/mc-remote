import { ControlButton } from './ControlButton';
import { Section } from './Section';
import type { RemoteAction } from '../types';

interface MissionsSectionProps {
  activeMission?: 'morning' | 'evening' | 'none';
  missionTimeRemaining?: string;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MissionsSection({ 
  activeMission, 
  missionTimeRemaining, 
  loadingActions, 
  dispatchAction 
}: MissionsSectionProps) {
  const isNone = !activeMission || activeMission === 'none';
  const phase = isNone ? null : activeMission;

  return (
    <Section 
      title={
        <div className="flex items-center justify-between w-full">
          <span>Missions</span>
          {!isNone && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${phase === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {phase}
              </span>
              {missionTimeRemaining && (
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-mono">
                  {missionTimeRemaining}
                </span>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {isNone ? (
          /* Start Buttons when idle */
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<span className="text-lg">☀️</span>} 
              label="Start Morning" 
              loading={loadingActions.has('mission-m-start')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' }, 'mission-m-start')} 
              bg="bg-amber-50"
              border="border-amber-100"
              className="h-20 rounded-2xl"
            />
            <ControlButton 
              icon={<span className="text-lg">🌙</span>} 
              label="Start Evening" 
              loading={loadingActions.has('mission-e-start')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' }, 'mission-e-start')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
              className="h-20 rounded-2xl"
            />
          </div>
        ) : (
          /* Shared Controls when active */
          <div className="grid grid-cols-4 gap-3">
             {/* Time Adjustments */}
             <div className="col-span-4 grid grid-cols-3 gap-2 mb-2">
                <ControlButton 
                  icon={<span className="text-xs">{phase === 'morning' ? '+1m' : '-1m'}</span>} 
                  label="" 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: phase!, deltaMinutes: phase === 'morning' ? 1 : -1 }, 'adj-1')} 
                  bg="bg-slate-50" 
                  className="h-10 rounded-xl" 
                />
                <ControlButton 
                  icon={<span className="text-xs">{phase === 'morning' ? '+5m' : '-5m'}</span>} 
                  label="" 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: phase!, deltaMinutes: phase === 'morning' ? 5 : -5 }, 'adj-5')} 
                  bg="bg-slate-50" 
                  className="h-10 rounded-xl" 
                />
                <ControlButton 
                  icon={<span className="text-xs">{phase === 'morning' ? '+10m' : '-10m'}</span>} 
                  label="" 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: phase!, deltaMinutes: phase === 'morning' ? 10 : -10 }, 'adj-10')} 
                  bg="bg-slate-50" 
                  className="h-10 rounded-xl" 
                />
             </div>

             {/* Stop Button */}
             <ControlButton 
                icon={<span className="text-xl">⏹️</span>} 
                label="Stop" 
                loading={loadingActions.has('mission-stop')}
                onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: phase! }, 'mission-stop')} 
                bg="bg-red-50"
                border="border-red-100"
                className="col-span-2 h-20 rounded-2xl"
             />

             {/* Action Group */}
             <div className="col-span-2 flex flex-col gap-2">
                <ControlButton 
                  icon={<span className="text-lg">🔄</span>} 
                  label="Reset" 
                  loading={loadingActions.has('mission-reset')}
                  onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: phase! }, 'mission-reset')} 
                  bg="bg-slate-100"
                  className="flex-1 rounded-xl"
                  fullWidth
                />
                <ControlButton 
                  icon={<span className="text-lg">😱</span>} 
                  label="Whine" 
                  loading={loadingActions.has('mission-whine')}
                  onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: phase!, lockedFromUI: true }, 'mission-whine')} 
                  bg="bg-orange-50"
                  className="flex-1 rounded-xl"
                  fullWidth
                />
             </div>
          </div>
        )}
      </div>
    </Section>
  );
}
