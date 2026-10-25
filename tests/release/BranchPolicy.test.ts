import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BranchPolicy } from '../../scripts/release/BranchPolicy.js';
import { SemanticVersion } from '../../scripts/release/SemanticVersion.js';

const policy = new BranchPolicy();
const judge = (branch: string, base: string, head: string): boolean =>
  policy.judge(branch, SemanticVersion.parse(base), SemanticVersion.parse(head)).ok;

test('a features branch must raise the minor version', () => {
  assert.equal(judge('features/peek', '0.2.0', '0.3.0'), true);
  assert.equal(judge('features/peek', '0.2.3', '0.3.0'), true);
  assert.equal(judge('features/peek', '0.2.0', '0.2.1'), false);
  assert.equal(judge('features/peek', '0.2.0', '0.2.0'), false);
});

test('a fix branch must raise the patch version', () => {
  assert.equal(judge('fix/tile-drag', '0.3.0', '0.3.1'), true);
  assert.equal(judge('fix/tile-drag', '0.3.0', '0.4.0'), false);
  assert.equal(judge('fix/tile-drag', '0.3.0', '0.3.0'), false);
});

test('any other branch must keep the version', () => {
  assert.equal(judge('docs/specs', '0.2.0', '0.2.0'), true);
  assert.equal(judge('docs/specs', '0.2.0', '0.3.0'), false);
});

test('the project stays below 1.0.0', () => {
  assert.equal(judge('features/base', '0.9.0', '1.0.0'), false);
  assert.equal(new BranchPolicy(1).judge('features/x', SemanticVersion.parse('1.0.0'), SemanticVersion.parse('1.1.0')).ok, true);
});

test('a failed verdict says what was expected', () => {
  const verdict = policy.judge('fix/x', SemanticVersion.parse('0.2.0'), SemanticVersion.parse('0.3.0'));
  assert.match(verdict.message, /must make a patch bump/);
});
