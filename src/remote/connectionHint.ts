/**
 * The one-line hints the phone shows when the connection looks fine but nothing useful arrives.
 * Supabase acknowledges every send itself, so "Live" and "Sent!" cannot tell that no desktop is
 * listening (after the desktop renews its pairing, an old pairing's room is empty).
 */
export type ConnectionHint = 'not-answering' | 'clock-skew';

export const HINT_TEXT: Record<ConnectionHint, string> = {
  'not-answering': 'Mission Control is not answering. If it was updated, scan its QR code again.',
  'clock-skew': "This phone's clock and the desktop's clock differ by more than 2 minutes.",
};

export const ANSWER_TIMEOUT_MS = 5000;

export interface HintTimers<Handle> {
  set: (callback: () => void, ms: number) => Handle;
  clear: (handle: Handle) => void;
}

export interface HintTracker {
  /** The sync request went out: show "not answering" unless a state is accepted in time. */
  syncRequested: () => void;
  stateAccepted: () => void;
  /** The desktop did answer, with a state refused for clock skew: that hint replaces the wait. */
  clockSkewed: () => void;
  /** Stops the wait (reconnect, unmount, channel lost). The tracker stays usable. */
  cancel: () => void;
}

export function createHintTracker<Handle>(onHint: (hint: ConnectionHint | null) => void, timers: HintTimers<Handle>): HintTracker {
  let pending: { handle: Handle } | null = null;

  const cancel = () => {
    if (pending) timers.clear(pending.handle);
    pending = null;
  };

  return {
    syncRequested: () => {
      cancel();
      const entry = {
        handle: timers.set(() => {
          if (pending === entry) pending = null;
          onHint('not-answering');
        }, ANSWER_TIMEOUT_MS),
      };
      pending = entry;
    },
    stateAccepted: () => {
      cancel();
      onHint(null);
    },
    clockSkewed: () => {
      cancel();
      onHint('clock-skew');
    },
    cancel,
  };
}

/** For the console: the rounded difference and which way, never the key or the state. */
export function clockSkewWarning(diffMs: number): string {
  const seconds = Math.round(Math.abs(diffMs) / 1000);
  const direction = diffMs < 0 ? 'ahead of' : 'behind';
  return `[Remote] Refused a verified state: the desktop's clock is ${seconds} s ${direction} this phone's (more than 2 minutes).`;
}
