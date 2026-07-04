import { Section } from './Section';
import type { RemoteAction } from '../types';

const MOOD_LEVELS = [
  { level: -2, emoji: '😡', label: 'Angry', color: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' },
  { level: -1, emoji: '🙁', label: 'Sad', color: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' },
  { level: 0,  emoji: '😐', label: 'Neutral', color: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' },
  { level: 1,  emoji: '🙂', label: 'Happy', color: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
  { level: 2,  emoji: '😃', label: 'Great', color: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' },
];

interface MoodWindSectionProps {
  currentLevel?: number;
  behaviorProgress?: number;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MoodWindSection({ currentLevel, behaviorProgress, loadingActions, dispatchAction }: MoodWindSectionProps) {
  const wind = currentLevel ?? 0;
  const progress = behaviorProgress ?? 0;
  const currentMood = MOOD_LEVELS.find(m => m.level === wind) ?? MOOD_LEVELS[2];

  return (
    <Section
      title={
        <div className="flex items-center justify-between w-full">
          <span>Mood Gauge</span>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-black">
            {currentMood.emoji} {Math.round(progress)}%
          </span>
        </div>
      }
    >
      <div className="flex gap-2">
        {MOOD_LEVELS.map((mood) => {
          const isActive = mood.level === wind;
          const isLoading = loadingActions.has(`mood-${mood.level}`);
          return (
            <button
              key={mood.level}
              disabled={isLoading}
              onClick={() => dispatchAction({ type: 'SET_MOOD_WIND', level: mood.level }, `mood-${mood.level}`)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all
                ${isActive
                  ? `${mood.color} ${mood.border} ring-2 ring-offset-1 ring-slate-300 scale-105`
                  : 'bg-slate-50/60 border-slate-100 opacity-60 hover:opacity-90'
                }
                ${isLoading ? 'animate-pulse' : ''}
              `}
            >
              <span className={`text-2xl ${isActive ? '' : 'grayscale-[50%]'}`}>{mood.emoji}</span>
              <span className={`text-[9px] font-black tracking-tight ${isActive ? mood.text : 'text-slate-400'}`}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress adjustment buttons */}
      <div className="flex gap-3 mt-2">
        <button
          disabled={loadingActions.has('progress-minus')}
          onClick={() => dispatchAction({ type: 'ADJUST_BEHAVIOR_PROGRESS', amount: -10, reason: 'Remote -10%' }, 'progress-minus')}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2
            bg-red-50 border-red-200 text-red-700 font-black text-sm
            active:scale-95 transition-all
            ${loadingActions.has('progress-minus') ? 'animate-pulse opacity-50' : ''}
          `}
        >
          <span className="text-lg">📉</span> −10%
        </button>
        <button
          disabled={loadingActions.has('progress-plus')}
          onClick={() => dispatchAction({ type: 'ADJUST_BEHAVIOR_PROGRESS', amount: 10, reason: 'Remote +10%' }, 'progress-plus')}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2
            bg-emerald-50 border-emerald-200 text-emerald-700 font-black text-sm
            active:scale-95 transition-all
            ${loadingActions.has('progress-plus') ? 'animate-pulse opacity-50' : ''}
          `}
        >
          <span className="text-lg">📈</span> +10%
        </button>
      </div>
    </Section>
  );
}
