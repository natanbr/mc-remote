import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RemoteAction } from '../types';
import { MissionSessionControls } from './MissionSessionControls';

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
  attemptedToday: boolean;
  activeMission: 'morning' | 'evening' | 'none' | undefined;
  connected: boolean;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MissionCard({ mission, countdown, attemptedToday, activeMission, connected, loadingActions, dispatchAction }: MissionCardProps) {
  const isMorning = mission.phase === 'morning';
  const isActive = mission.active;
  const targetPhase = mission.phase;

  const [expanded, setExpanded] = useState(isActive);
  const [wasActive, setWasActive] = useState(isActive);

  // Auto-expand card if the mission becomes active (adjusted during render,
  // not in an effect, so there is no extra collapsed frame)
  if (isActive !== wasActive) {
    setWasActive(isActive);
    if (isActive) setExpanded(true);
  }

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
            {attemptedToday ? (
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-100/60 px-2 py-0.5 rounded-full border border-slate-200/50">
                Attempted today
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/40 px-2 py-0.5 rounded-full border border-slate-200/20">
                Inactive
              </span>
            )}
            {mission.startsAt && (
              <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-tight lowercase">
                scheduled: {formatStartsAt(mission.startsAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls Grid */}
      <div className="flex flex-col gap-3">
        <MissionSessionControls
          key={`${targetPhase}-${isActive ? mission.startedAt ?? 'running' : 'idle'}`}
          phase={targetPhase}
          active={isActive}
          attemptedToday={attemptedToday}
          activeMission={activeMission}
          connected={connected}
          loadingActions={loadingActions}
          startColor={theme.btnStartBg}
          dispatchAction={dispatchAction}
        />
        {isActive && (
          <>
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

