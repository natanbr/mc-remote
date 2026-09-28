import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSWER_TIMEOUT_MS,
  HINT_TEXT,
  clockSkewWarning,
  createHintTracker,
  type ConnectionHint,
} from './connectionHint.ts';

/** Timers the test fires by hand. */
function fakeTimers() {
  let nextId = 1;
  const pending = new Map<number, { callback: () => void; ms: number }>();
  return {
    pending,
    timers: {
      set: (callback: () => void, ms: number) => {
        const id = nextId++;
        pending.set(id, { callback, ms });
        return id;
      },
      clear: (id: number) => void pending.delete(id),
    },
    fireAll() {
      const due = [...pending.values()];
      pending.clear();
      for (const { callback } of due) callback();
    },
  };
}

function harness() {
  const hints: (ConnectionHint | null)[] = [];
  const clock = fakeTimers();
  const tracker = createHintTracker((hint) => hints.push(hint), clock.timers);
  return { hints, clock, tracker };
}

test('no accepted state within 5 s of the sync request shows the "not answering" hint', () => {
  const h = harness();
  h.tracker.syncRequested();
  assert.equal(h.clock.pending.size, 1);
  assert.equal([...h.clock.pending.values()][0].ms, ANSWER_TIMEOUT_MS);
  assert.equal(ANSWER_TIMEOUT_MS, 5000);
  h.clock.fireAll();
  assert.deepEqual(h.hints, ['not-answering']);
});

test('an accepted state cancels the timer and clears the hint', () => {
  const h = harness();
  h.tracker.syncRequested();
  h.tracker.stateAccepted();
  assert.equal(h.clock.pending.size, 0);
  assert.deepEqual(h.hints, [null]);
  h.tracker.syncRequested();
  h.clock.fireAll();
  h.tracker.stateAccepted();
  assert.deepEqual(h.hints, [null, 'not-answering', null], 'a late state clears a shown hint');
});

test('cancel (reconnect, unmount, channel lost) stops the timer and leaves the tracker usable', () => {
  const h = harness();
  h.tracker.syncRequested();
  h.tracker.cancel();
  assert.equal(h.clock.pending.size, 0);
  h.clock.fireAll();
  assert.deepEqual(h.hints, []);
  h.tracker.syncRequested(); // StrictMode's simulated unmount must not disable the live connection
  h.clock.fireAll();
  assert.deepEqual(h.hints, ['not-answering']);
});

test('a new sync request restarts the 5 s wait instead of stacking timers', () => {
  const h = harness();
  h.tracker.syncRequested();
  h.tracker.syncRequested();
  assert.equal(h.clock.pending.size, 1);
});

test('a clock-skew refusal means the desktop answered: it replaces the timer with the clock hint', () => {
  const h = harness();
  h.tracker.syncRequested();
  h.tracker.clockSkewed();
  assert.equal(h.clock.pending.size, 0);
  h.clock.fireAll();
  assert.deepEqual(h.hints, ['clock-skew']);
});

test('the hint texts a parent sees', () => {
  assert.equal(HINT_TEXT['not-answering'], 'Mission Control is not answering. If it was updated, scan its QR code again.');
  assert.equal(HINT_TEXT['clock-skew'], "This phone's clock and the desktop's clock differ by more than 2 minutes.");
});

test('the clock-skew console warning gives the rounded difference in seconds and the direction', () => {
  assert.match(clockSkewWarning(-150_400), /150 s/);
  assert.match(clockSkewWarning(-150_400), /ahead/);
  assert.match(clockSkewWarning(3 * 86_400_000 + 400), /259200 s/);
  assert.match(clockSkewWarning(3 * 86_400_000), /behind/);
});
