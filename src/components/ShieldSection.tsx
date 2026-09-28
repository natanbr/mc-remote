import { Section } from './Section';
import { SHIELD_SEGMENTS, shieldSegmentsLeft } from '../shield';
import type { RemoteAction } from '../types';

type FillTier = 'green' | 'amber' | 'red';

// Same thresholds as the desktop's shieldTier(). The desktop's 'broken' tier
// has no entry here because at zero left no segment is filled.
function fillTier(left: number): FillTier {
  if (left <= 1) return 'red';
  if (left <= 3) return 'amber';
  return 'green';
}

const TIER_FILL: Record<FillTier, string> = {
  green: 'bg-emerald-300 border-emerald-500',
  amber: 'bg-amber-300 border-amber-500',
  red: 'bg-red-300 border-red-500',
};

interface ShieldSectionProps {
  missedMissionStreak?: number;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function ShieldSection({ missedMissionStreak, loadingActions, dispatchAction }: ShieldSectionProps) {
  const known = shieldSegmentsLeft(missedMissionStreak);
  const left = known ?? SHIELD_SEGMENTS;
  const broken = left === 0;
  const tier = fillTier(left);

  // Only −1 is ever disabled from the snapshot. The phone never ages it and
  // a lost desktop broadcast is not re-sent, so a stale "6 / 6" could grey
  // out +1 for hours — and +1 is the parent's only remote way out of a
  // locked bank. A +1 at 6 / 6 is a harmless no-op on the desktop.
  const cannotTake = broken;

  return (
    <Section
      title={
        <div className="flex items-center justify-between w-full">
          <span>Shield</span>
          {known !== null && (
            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-black tabular-nums">
              {broken ? '💔' : '🛡️'} {left} / {SHIELD_SEGMENTS}
            </span>
          )}
        </div>
      }
    >
      {known !== null && (
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
                i < left ? TIER_FILL[tier] : 'bg-slate-200 border-transparent'
              }`}
            />
          ))}
        </div>
      )}

      {broken && (
        <div
          role="status"
          className="mb-2 rounded-xl border-2 border-red-200 bg-red-50 py-1.5 text-center text-[11px] font-black text-red-700"
        >
          🔒 Bank locked
        </div>
      )}

      <div className="flex gap-3">
        <button
          aria-label="Take away one shield"
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
          aria-label="Give back one shield"
          disabled={loadingActions.has('shield-plus')}
          onClick={() => dispatchAction({ type: 'ADJUST_SHIELD', delta: 1 }, 'shield-plus')}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2
            bg-emerald-50 border-emerald-200 text-emerald-700 font-black text-sm
            active:scale-95 transition-all
            ${loadingActions.has('shield-plus') ? 'animate-pulse opacity-50' : ''}
          `}
        >
          <span className="text-lg">🛡️</span> +1 shield
        </button>
      </div>
    </Section>
  );
}
