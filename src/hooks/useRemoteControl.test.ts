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
