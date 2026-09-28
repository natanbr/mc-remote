import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Structural: the hook renders React, which node:test cannot mount, so this reads the source.
// An Error's cause can quote the raw server reply, including the channel topic and so the full
// room id; the console must only ever get the message.
const source = readFileSync(new URL('./useRemoteControl.ts', import.meta.url), 'utf8');

test('the hook never hands a raw error object to the console', () => {
  const calls = source.match(/console\.(error|warn|log)\([\s\S]*?\);/g) ?? [];
  assert.ok(calls.length >= 3, `expected the hook's console calls, found ${calls.length}`);
  for (const call of calls) {
    // A bare error as a whole argument; `messageOf(e)` is fine.
    assert.doesNotMatch(call, /(console\.\w+\(|,)\s*(e|err|error)\s*\)/, `logs a raw error: ${call}`);
  }
});

test('the pairing is re-read on hashchange, and the listener is removed on unmount', () => {
  const added = source.match(/addEventListener\('hashchange', (\w+)\)/);
  assert.ok(added, 'a same-tab link (#room=...&key=...) must re-pair and be wiped from the address bar');
  assert.ok(source.includes(`removeEventListener('hashchange', ${added[1]})`), 'removed in the effect cleanup');
});

test('every SUBSCRIBED (an automatic rejoin included) restarts the replay window and the answer wait', () => {
  const fromSubscribed = source.slice(source.indexOf("status === 'SUBSCRIBED'"));
  const branch = fromSubscribed.slice(0, fromSubscribed.indexOf('} else {'));
  assert.match(branch, /\.connected\(\)/);
  assert.match(branch, /\.syncRequested\(\)/);
});

test('the subscribe error is logged with the room id shortened', () => {
  assert.match(source, /redactRoomId\(err\.message, /);
});
