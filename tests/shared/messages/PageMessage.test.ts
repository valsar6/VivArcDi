import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasEnvelope, parsePageMessage } from '../../../src/shared/messages/PageMessage.js';

interface Sample extends Record<string, unknown> {
  type: 'x';
  token: string;
  n: number;
}

const PREFIX = 'sample:';
const isSample = (candidate: Record<string, unknown>): candidate is Sample =>
  hasEnvelope(candidate, 'x') && typeof candidate['n'] === 'number';

const VALID: Sample = { type: 'x', token: 't', n: 1 };

test('parsePageMessage returns a valid runtime message', () => {
  assert.deepEqual(parsePageMessage(VALID, PREFIX, isSample), VALID);
});

test('parsePageMessage returns a valid console line', () => {
  assert.deepEqual(parsePageMessage(`${PREFIX}${JSON.stringify(VALID)}`, PREFIX, isSample), VALID);
});

test('parsePageMessage rejects a wrong prefix', () => {
  assert.equal(parsePageMessage(`other:${JSON.stringify(VALID)}`, PREFIX, isSample), null);
});

test('parsePageMessage rejects broken JSON', () => {
  assert.equal(parsePageMessage(`${PREFIX}{broken`, PREFIX, isSample), null);
});

test('parsePageMessage rejects a wrong shape', () => {
  assert.equal(parsePageMessage(null, PREFIX, isSample), null);
  assert.equal(parsePageMessage(5, PREFIX, isSample), null);
  assert.equal(parsePageMessage([VALID], PREFIX, isSample), null);
  assert.equal(parsePageMessage({ ...VALID, n: 'one' }, PREFIX, isSample), null);
  assert.equal(parsePageMessage({ ...VALID, token: 7 }, PREFIX, isSample), null);
});
