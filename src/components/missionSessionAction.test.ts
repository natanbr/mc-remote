import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { missionSessionAction, type MissionSessionInput } from './missionSessionAction.ts';

const idle: MissionSessionInput = {
  kind: 'start', phase: 'morning', activeMission: 'none', connected: true, loadingActions: new Set(),
};

test('the phone starts either mission from idle, including after another attempt today', () => {
  for (const phase of ['morning', 'evening'] as const) {
    const input = { ...idle, phase };
    const expected = { type: 'SET_ACTIVE_MISSION', phase };
    assert.deepEqual(missionSessionAction(input), expected);
    // The host has ended the first attempt; its date/history must never disable another one.
    assert.deepEqual(missionSessionAction({ ...input, activeMission: 'none' }), expected);
  }
});

test('starting waits for connection and authoritative host state', () => {
  assert.equal(missionSessionAction({ ...idle, connected: false }), null);
  assert.equal(missionSessionAction({ ...idle, activeMission: undefined }), null);
});

test('starting refuses overlap with either running phase', () => {
  for (const activeMission of ['morning', 'evening'] as const) {
    assert.equal(missionSessionAction({ ...idle, activeMission }), null);
  }
});

test('restart resets the timer only for the running mission and remains available after a miss', () => {
  assert.deepEqual(missionSessionAction({ ...idle, kind: 'restart', activeMission: 'morning' }), {
    type: 'RESET_MISSION_WITH_TIMER', missionPhase: 'morning',
  });
  assert.equal(missionSessionAction({ ...idle, kind: 'restart' }), null);
  assert.equal(missionSessionAction({ ...idle, kind: 'restart', activeMission: 'evening' }), null);
});

test('any pending mission session command blocks another start or restart', () => {
  for (const phase of ['morning', 'evening']) {
    for (const action of ['start', 'restart', 'stop', 'reset']) {
      const loadingActions = new Set([`${phase}-${action}`]);
      assert.equal(missionSessionAction({ ...idle, loadingActions }), null);
      assert.equal(missionSessionAction({ ...idle, kind: 'restart', activeMission: 'morning', loadingActions }), null);
    }
  }
  assert.notEqual(missionSessionAction({ ...idle, loadingActions: new Set(['bank-add-1']) }), null);
});

test('a fresh reconnect allows another session only once host state is known', () => {
  assert.equal(missionSessionAction({ ...idle, connected: false }), null);
  assert.equal(missionSessionAction({ ...idle, activeMission: undefined }), null);
  assert.deepEqual(missionSessionAction({ ...idle }), { type: 'SET_ACTIVE_MISSION', phase: 'morning' });
});

test('Stop recovers a stuck active card without allowing a new start or restart', () => {
  const input = { ...idle, kind: 'stop' as const, missionActive: true };
  assert.deepEqual(missionSessionAction(input), { type: 'CANCEL_MISSION', missionPhase: 'morning' });
  assert.equal(missionSessionAction({ ...input, activeMission: 'evening' }), null);
  assert.equal(missionSessionAction({ ...input, missionActive: false }), null);
  assert.equal(missionSessionAction({ ...input, connected: false }), null);
  assert.equal(missionSessionAction({ ...input, activeMission: undefined }), null);
  assert.equal(missionSessionAction({ ...input, loadingActions: new Set(['evening-start']) }), null);
  assert.equal(missionSessionAction({ ...input, kind: 'restart' }), null);
});

test('restart confirmation is inline and rechecks eligibility when confirmed', () => {
  const source = readFileSync(new URL('./MissionSessionControls.tsx', import.meta.url), 'utf8');
  assert.match(source, /missionSessionAction\(/);
  assert.match(source, /disabled=\{!action\}/);
  assert.match(source, /if \(!action \|\| !active\) return/);
  assert.match(source, /setConfirmingRestart\(false\)/);
  assert.match(source, /Restart now/);
  assert.match(source, /Cancel/);
  assert.doesNotMatch(source, /window\.confirm\(/);
  assert.match(source, /Earlier misses still count/);
  assert.match(source, /Start another session/);
  assert.doesNotMatch(source, /Done Today/);
});

test('restart confirmation expires when the running attempt changes or ends', () => {
  const source = readFileSync(new URL('./MissionCard.tsx', import.meta.url), 'utf8');
  assert.match(source, /key=\{`\$\{targetPhase\}-\$\{isActive \? mission\.startedAt \?\? 'running' : 'idle'\}`\}/);
});
