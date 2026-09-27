import { Section } from './Section';
import type { RemoteAction } from '../types';

// Mirrors the desktop's ShieldPanel: one segment per mission the child can still
// miss; at zero the desktop freezes the child's economy.
const SHIELD_SEGMENTS = 6;

type ShieldTier = 'green' | 'amber' | 'red' | 'broken';

// Same thresholds as the desktop's shieldTier(), keyed on misses.
function shieldTier(missed: number): ShieldTier {
  if (missed >= SHIELD_SEGMENTS) return 'broken';
  if (missed >= 5) return 'red';
  if (missed >= 3) return 'amber';
  return 'green';
}

const TIER_FILL: Record<ShieldTier, string> = {
  green: 'bg-emerald-300 border-emerald-500',
  amber: 'bg-amber-300 border-amber-500',
  red: 'bg-red-300 border-red-500',
  broken: 'bg-red-300 border-red-500',
};

interface ShieldSectionProps {
  missedMissionStreak?: number;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function ShieldSection({ missedMissionStreak, loadingActions, dispatchAction }: ShieldSectionProps) {
  const known = typeof missedMissionStreak === 'number' && Number.isFinite(missedMissionStreak);
  const missed = known ? Math.min(SHIELD_SEGMENTS, Math.max(0, Math.floor(missedMissionStreak))) : 0;
  const left = SHIELD_SEGMENTS - missed;
  const tier = shieldTier(missed);
  const broken = known && tier === 'broken';

  // The desktop clamps and writes no log for a press at either end, so an
  // enabled button there would do nothing visible. Only disable once the
  // state is known; before the first broadcast both stay usable.
  const cannotTake = known && left === 0;
  const cannotGive = known && left === SHIELD_SEGMENTS;

  return (
    <Section
      title={
        <div className="flex items-center justify-between w-full">
          <span>Shield</span>
          {known && (
            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-black tabular-nums">
              {broken ? '💔' : '🛡️'} {left} / {SHIELD_SEGMENTS}
            </span>
          )}
        </div>
      }
    >
      {known && (
        <div
          role="meter"
          aria-label="Shield"
          aria-valuenow={left}
          aria-valuemin={0}
          aria-valuemax={SHIELD_SEGMENTS}
          aria-valuetext={`${left} of ${SHIELD_SEGMENTS} shields left`}
          className="grid grid-cols-6 gap-1.5 mb-2"
        >
          {Array.from({ length: SHIELD_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded-md border transition-colors ${
                i < left ? TIER_FILL[tier] : 'bg-slate-100 border-transparent'
              }`}
            />
          ))}
        </div>
      )}

      {broken && (
        <div className="mb-2 rounded-xl border-2 border-red-200 bg-red-50 py-1.5 text-center text-[11px] font-black text-red-700">
          🔒 Bank locked
        </div>
      )}

      <div className="flex gap-3">
        <button
          disabled={cannotTake || loadingActions.has('shield-minus')}
          onClick={() => dispatchAction({ type: 'ADJUST_SHIELD', delta: -1 }, 'shield-minus')}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2
            bg-red-50 border-red-200 text-red-700 font-black text-sm
            active:scale-95 transition-all
            ${cannotTake ? 'opacity-40 grayscale cursor-not-allowed' : ''}
            ${loadingActions.has('shield-minus') ? 'animate-pulse opacity-50' : ''}
          `}
        >
          <span className="text-lg">💥</span> −1 shield
        </button>
        <button
          disabled={cannotGive || loadingActions.has('shield-plus')}
          onClick={() => dispatchAction({ type: 'ADJUST_SHIELD', delta: 1 }, 'shield-plus')}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2
            bg-emerald-50 border-emerald-200 text-emerald-700 font-black text-sm
            active:scale-95 transition-all
            ${cannotGive ? 'opacity-40 grayscale cursor-not-allowed' : ''}
            ${loadingActions.has('shield-plus') ? 'animate-pulse opacity-50' : ''}
          `}
        >
          <span className="text-lg">🛡️</span> +1 shield
        </button>
      </div>
    </Section>
  );
}
