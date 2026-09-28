import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { engines?: { node?: string } };

test('package.json pins Node >= 22.18: npm test relies on its built-in TypeScript type stripping', () => {
  assert.equal(pkg.engines?.node, '>=22.18');
});
