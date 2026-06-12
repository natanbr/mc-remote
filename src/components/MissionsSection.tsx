import { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Section } from './Section';
import type { RemoteAction, RemoteMission } from '../types';

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

function formatStartsAt(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const m = parseInt(mStr, 10);
  const mFormatted = m === 0 ? '' : `:${mStr}`;
  return `${h12}${mFormatted}${ampm}`;
}

interface MissionsSectionProps {
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

interface MissionCardProps {
  mission: {
    phase: 'morning' | 'evening';
    active: boolean;
    startsAt: string;
    startedAt?: string | null;
    durationMins?: number | null;
    whiningDetected: boolean;
    tasks: Array<{ id: string; label: string; icon: string; completed: boolean; locked: boolean }>;
  };
  countdown: string | null;
  completedToday: boolean;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

function MissionCard({ mission, countdown, completedToday, loadingActions, dispatchAction }: MissionCardProps) {
  const isMorning = mission.phase === 'morning';
  const isActive = mission.active;
  const targetPhase = mission.phase;

  const [expanded, setExpanded] = useState(isActive);

  // Auto-expand card if the mission becomes active
  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  const tasksTotal = mission.tasks.length;
  const tasksDone = mission.tasks.filter(t => t.completed).length;

  // Set theme colors based on morning/evening phase
  const theme = isMorning
    ? {
        cardBg: 'bg-gradient-to-br from-amber-50 to-orange-100/50 border-amber-200/50 shadow-amber-100/10',
        titleColor: 'text-amber-800',
        btnStartBg: 'bg-amber-500 active:bg-amber-600 text-white',
        btnTimeBg: 'bg-amber-100/60 text-amber-800 hover:bg-amber-200/60 border-amber-200/30',
        accentColor: 'text-amber-600',
        pulseDot: 'bg-amber-500',
      }
    : {
        cardBg: 'bg-gradient-to-br from-indigo-50 to-purple-100/50 border-indigo-200/50 shadow-indigo-100/10',
        titleColor: 'text-indigo-800',
        btnStartBg: 'bg-indigo-600 active:bg-indigo-700 text-white',
        btnTimeBg: 'bg-indigo-100/60 text-indigo-800 hover:bg-indigo-200/60 border-indigo-200/30',
        accentColor: 'text-indigo-600',
        pulseDot: 'bg-indigo-600',
      };

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${theme.cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isMorning ? '☀️' : '🌙'}</span>
          <span className={`font-black tracking-tight text-sm uppercase ${theme.titleColor}`}>
            {isMorning ? 'Morning Mission' : 'Evening Mission'}
          </span>
        </div>

        {/* Status Badge, Countdown, and Scheduled Time */}
        {isActive ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pulseDot}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.pulseDot}`}></span>
            </span>
            {countdown ? (
              <span className={`text-sm font-mono font-black ${theme.accentColor}`}>{countdown}</span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">Active</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            {completedToday ? (
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
                ✅ Done Today
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/40 px-2 py-0.5 rounded-full border border-slate-200/20">
                Inactive
              </span>
            )}
            {mission.startsAt && (
              <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-tight lowercase">
                next: {formatStartsAt(mission.startsAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls Grid */}
      <div className="flex flex-col gap-3">
        {!isActive ? (
          <button
            onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: targetPhase }, `${targetPhase}-start`)}
            disabled={loadingActions.has(`${targetPhase}-start`)}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all duration-200 active:scale-[0.98] ${theme.btnStartBg} flex items-center justify-center gap-2`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Mission
          </button>
        ) : (
          <>
            {/* Active Control Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: targetPhase }, `${targetPhase}-stop`)}
                disabled={loadingActions.has(`${targetPhase}-stop`)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
              <button
                onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: targetPhase }, `${targetPhase}-reset`)}
                disabled={loadingActions.has(`${targetPhase}-reset`)}
                className="py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Time Adjustment Controls */}
            <div className="grid grid-cols-2 gap-2 bg-white/40 p-1.5 rounded-xl border border-white/50">
              <div className="grid grid-cols-3 gap-1">
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 1 }, `${targetPhase}-time-1`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  +1m
                </button>
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 5 }, `${targetPhase}-time-5`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  +5m
                </button>
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: 10 }, `${targetPhase}-time-10`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  +10m
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -1 }, `${targetPhase}-time-neg1`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  -1m
                </button>
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -5 }, `${targetPhase}-time-neg5`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  -5m
                </button>
                <button 
                  onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: targetPhase, deltaMinutes: -10 }, `${targetPhase}-time-neg10`)} 
                  className={`py-1 px-0.5 rounded-lg text-[9px] font-black border transition-all active:scale-[0.95] ${theme.btnTimeBg}`}
                >
                  -10m
                </button>
              </div>
            </div>

            {/* Whining Button */}
            <button
              onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: targetPhase, lockedFromUI: true }, `${targetPhase}-whine`)}
              disabled={loadingActions.has(`${targetPhase}-whine`)}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-[0.98] border ${
                mission.whiningDetected 
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-md shadow-red-100 animate-pulse font-extrabold' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-red-700'
              }`}
            >
              <span className="mr-1.5">{mission.whiningDetected ? '😠' : '😤'}</span>
              {mission.whiningDetected ? 'Whining Active (-1 Star)' : 'Whining?'}
            </button>
          </>
        )}
      </div>

      {/* Task Checklist Header */}
      {isActive && tasksTotal > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200/30">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span className="text-[9px] font-black uppercase tracking-wider">
              Task Checklist ({tasksDone}/{tasksTotal} done)
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Checklist list */}
          {expanded && (
            <div className="flex flex-col gap-2 mt-2">
              {mission.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => !task.locked && dispatchAction({ type: 'COMPLETE_TASK', missionPhase: targetPhase, taskId: task.id }, `task-${task.id}`)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                    task.completed 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 shadow-sm' 
                      : task.locked 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                  }`}
                  disabled={task.locked}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{getTaskIcon(task.icon)}</span>
                    <span className={`text-xs font-bold ${task.completed ? 'line-through opacity-60' : ''}`}>
                      {task.label}
                    </span>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    task.completed 
                      ? 'bg-emerald-500 border-emerald-600 text-white' 
                      : 'border-slate-300 bg-slate-50'
                  }`}>
                    {task.completed && <span className="text-[9px] font-black">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MissionsSection({
  activeMission,
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

  const morningCountdown = useCountdown(morningMissionData.startedAt, morningMissionData.durationMins);
  const eveningCountdown = useCountdown(eveningMissionData.startedAt, eveningMissionData.durationMins);

  // Compare completion dates with Swedish locale date (local timezone YYYY-MM-DD)
  const todayStr = new Date().toLocaleDateString('sv');
  const morningCompletedToday = lastCompletedOrFailedMorningDate === todayStr;
  const eveningCompletedToday = lastCompletedOrFailedEveningDate === todayStr;

  const isAnyActive = morningMissionData.active || eveningMissionData.active;

  return (
    <Section title="Missions">
      <div className="flex flex-col gap-4">
        {(!isAnyActive || morningMissionData.active) && (
          <MissionCard
            mission={morningMissionData}
            countdown={morningCountdown}
            completedToday={morningCompletedToday}
            loadingActions={loadingActions}
            dispatchAction={dispatchAction}
          />
        )}
        {(!isAnyActive || eveningMissionData.active) && (
          <MissionCard
            mission={eveningMissionData}
            countdown={eveningCountdown}
            completedToday={eveningCompletedToday}
            loadingActions={loadingActions}
            dispatchAction={dispatchAction}
          />
        )}
      </div>
    </Section>
  );
}
