import { useState, useEffect } from 'react';
import { ControlButton } from './ControlButton';
import { Section } from './Section';
import type { RemoteAction } from '../types';

const ICON_MAP: Record<string, string> = {
  Shirt:         '👕',
  Smile:         '🦷',
  Toothbrush:    '🪥',
  Droplets:      '🚿',
  Droplet:       '💧',
  Moon:          '🌙',
  Layers:        '👘',
  ToyBrick:      '🧸',
  Sparkles:      '✨',
  BookOpen:      '📖',
  MessageCircle: '💬',
  BedDouble:     '🛏️',
  MoonStar:      '🌙',
  Dog:           '🐕',
  Pill:          '💊',
};

const getTaskIcon = (name: string) => ICON_MAP[name] ?? (name.match(/^[A-Za-z]+$/) ? '⭐' : name);

interface MissionsSectionProps {
  activeMission?: 'morning' | 'evening' | 'none';
  missionStartedAt?: string | null;
  missionDurationMins?: number | null;
  whiningDetected?: boolean;
  missionTasks?: Array<{ id: string; label: string; icon: string; completed: boolean; locked: boolean }>;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

function useCountdown(startedAt: string | null | undefined, durationMins: number | null | undefined): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!startedAt || durationMins == null) {
      const timer = setTimeout(() => {
        setDisplay(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const tick = () => {
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const totalMs = durationMins * 60 * 1000;
      const remainingMs = totalMs - elapsedMs;

      if (remainingMs <= 0) {
        setDisplay('00:00');
        return;
      }

      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
      const secs = (totalSecs % 60).toString().padStart(2, '0');
      setDisplay(`${mins}:${secs}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [startedAt, durationMins]);

  return display;
}

export function MissionsSection({ activeMission, missionStartedAt, missionDurationMins, loadingActions, dispatchAction }: MissionsSectionProps) {
  const isActive = !!(activeMission && activeMission !== 'none');
  const targetPhase = isActive ? activeMission! : 'morning';
  const countdown = useCountdown(missionStartedAt, missionDurationMins);

  const missionColor = activeMission === 'morning' ? 'text-amber-600' : 'text-indigo-600';
  const missionLabel = activeMission === 'morning' ? '☀️ Morning' : activeMission === 'evening' ? '🌙 Evening' : null;

  return (
    <Section title="Missions">
      <div className="flex flex-col gap-4">
        
        {/* Active Mission Status Banner */}
        {isActive && countdown && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100`}>
            <span className={`text-xs font-black uppercase tracking-wide ${missionColor}`}>{missionLabel} Active</span>
            <span className={`text-lg font-mono font-black ${missionColor}`}>{countdown}</span>
          </div>
        )}

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

        {/* Time Adjustments (Shared — target active mission) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            <ControlButton icon={<span className="text-[10px] font-bold">+1m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 1 }, 'm-time-1')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">+5m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 5 }, 'm-time-5')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">+10m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 10 }, 'm-time-10')} bg="bg-amber-50/50" className="h-10 rounded-lg !p-0" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <ControlButton icon={<span className="text-[10px] font-bold">-1m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -1 }, 'e-time-1')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">-5m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -5 }, 'e-time-5')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
            <ControlButton icon={<span className="text-[10px] font-bold">-10m</span>} label="" disabled={!isActive} onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -10 }, 'e-time-10')} bg="bg-indigo-50/50" className="h-10 rounded-lg !p-0" />
          </div>
        </div>

        {/* Shared Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <ControlButton 
            icon={<span className="text-xl">⏹️</span>} 
            label="Stop" 
            disabled={!isActive}
            loading={loadingActions.has('shared-stop')}
            onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: targetPhase }, 'shared-stop')} 
            bg="bg-slate-100"
            className="h-16 rounded-xl"
          />
          <ControlButton 
            icon={<span className="text-xl">🔄</span>} 
            label="Reset" 
            disabled={!isActive}
            loading={loadingActions.has('shared-reset')}
            onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: targetPhase }, 'shared-reset')} 
            bg="bg-slate-100"
            className="h-16 rounded-xl"
          />
          <ControlButton 
            icon={<span className="text-xl">{whiningDetected ? '😠' : '😱'}</span>} 
            label={whiningDetected ? 'Whining Active' : 'Whine'} 
            disabled={!isActive}
            loading={loadingActions.has('shared-whine')}
            onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: targetPhase, lockedFromUI: true }, 'shared-whine')} 
            bg={whiningDetected ? 'bg-rose-500 text-white animate-pulse' : 'bg-red-50 text-red-700'}
            border={whiningDetected ? 'border-rose-600' : 'border-red-100'}
            className="h-16 rounded-xl font-black"
          />
        </div>

        {/* Task Checklist */}
        {isActive && missionTasks && missionTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 pl-1">Tasks Checklist</div>
            <div className="flex flex-col gap-2">
              {missionTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => !task.locked && dispatchAction({ type: 'COMPLETE_TASK', missionPhase: targetPhase, taskId: task.id }, `task-${task.id}`)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                    task.completed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' 
                      : task.locked 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  disabled={task.locked}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">{getTaskIcon(task.icon)}</span>
                    <span className={`text-sm font-bold ${task.completed ? 'line-through opacity-60' : ''}`}>
                      {task.label}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    task.completed 
                      ? 'bg-emerald-500 border-emerald-600 text-white' 
                      : 'border-slate-300'
                  }`}>
                    {task.completed && <span className="text-[10px] font-black">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </Section>
  );
}
