import { ControlButton } from './ControlButton';
import { Section } from './Section';
import type { RemoteAction } from '../types';

interface MissionsSectionProps {
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MissionsSection({ loadingActions, dispatchAction }: MissionsSectionProps) {
  return (
    <Section title="Missions">
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        
        {/* Morning Labels */}
        <div className="col-span-2 text-[9px] font-black uppercase text-amber-500 tracking-tight pl-1">☀️ Morning</div>
        {/* Evening Labels */}
        <div className="col-span-2 text-[9px] font-black uppercase text-indigo-500 tracking-tight pl-1">🌙 Evening</div>

        {/* Morning Start/Stop */}
        <ControlButton 
          icon={<span className="text-lg">▶️</span>} 
          label="Start" 
          loading={loadingActions.has('mission-m-start')}
          onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' }, 'mission-m-start')} 
          bg="bg-amber-50"
          border="border-amber-100"
          className="h-16 rounded-xl"
        />
        <ControlButton 
          icon={<span className="text-lg">⏹️</span>} 
          label="Stop" 
          loading={loadingActions.has('mission-m-stop')}
          onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: 'morning' }, 'mission-m-stop')} 
          bg="bg-amber-50"
          border="border-amber-100"
          className="h-16 rounded-xl"
        />

        {/* Evening Start/Stop */}
        <ControlButton 
          icon={<span className="text-lg">▶️</span>} 
          label="Start" 
          loading={loadingActions.has('mission-e-start')}
          onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' }, 'mission-e-start')} 
          bg="bg-indigo-50"
          border="border-indigo-100"
          className="h-16 rounded-xl"
        />
        <ControlButton 
          icon={<span className="text-lg">⏹️</span>} 
          label="Stop" 
          loading={loadingActions.has('mission-e-stop')}
          onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: 'evening' }, 'mission-e-stop')} 
          bg="bg-indigo-50"
          border="border-indigo-100"
          className="h-16 rounded-xl"
        />

        {/* Morning Time Adjustments */}
        <div className="col-span-2 grid grid-cols-3 gap-1.5">
          <ControlButton icon={<span className="text-xs">1m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 1 }, 'm-time-1')} bg="bg-amber-50/50" className="h-10 rounded-lg" />
          <ControlButton icon={<span className="text-xs">5m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 5 }, 'm-time-5')} bg="bg-amber-50/50" className="h-10 rounded-lg" />
          <ControlButton icon={<span className="text-xs">10m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 10 }, 'm-time-10')} bg="bg-amber-50/50" className="h-10 rounded-lg" />
        </div>

        {/* Evening Time Adjustments */}
        <div className="col-span-2 grid grid-cols-3 gap-1.5">
          <ControlButton icon={<span className="text-xs">-1m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -1 }, 'e-time-1')} bg="bg-indigo-50/50" className="h-10 rounded-lg" />
          <ControlButton icon={<span className="text-xs">-5m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -5 }, 'e-time-5')} bg="bg-indigo-50/50" className="h-10 rounded-lg" />
          <ControlButton icon={<span className="text-xs">-10m</span>} label="" onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -10 }, 'e-time-10')} bg="bg-indigo-50/50" className="h-10 rounded-lg" />
        </div>

        {/* Morning Footer */}
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          <ControlButton icon={<span className="text-base">🔄</span>} label="Reset" onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: 'morning' }, 'm-reset')} bg="bg-slate-50" className="h-12 rounded-lg" />
          <ControlButton icon={<span className="text-base">😱</span>} label="Whine" onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'morning', lockedFromUI: true }, 'm-whine')} bg="bg-red-50" className="h-12 rounded-lg" />
        </div>

        {/* Evening Footer */}
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          <ControlButton icon={<span className="text-base">🔄</span>} label="Reset" onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: 'evening' }, 'e-reset')} bg="bg-slate-50" className="h-12 rounded-lg" />
          <ControlButton icon={<span className="text-base">😱</span>} label="Whine" onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'evening', lockedFromUI: true }, 'e-whine')} bg="bg-red-50" className="h-12 rounded-lg" />
        </div>

      </div>
    </Section>
  );
}
