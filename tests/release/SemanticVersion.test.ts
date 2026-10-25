import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticVersion } from '../../scripts/release/SemanticVersion.js';

const v = (text: string): SemanticVersion => SemanticVersion.parse(text);

test('parse reads major.minor.patch and refuses anything else', () => {
  assert.equal(v('0.2.0').toString(), '0.2.0');
  assert.throws(() => v('0.2'));
  assert.throws(() => v('0.2.0-beta'));
});

test('bumpFrom names a single step', () => {
  assert.equal(v('0.3.0').bumpFrom(v('0.2.4')), 'minor');
  assert.equal(v('0.2.5').bumpFrom(v('0.2.4')), 'patch');
  assert.equal(v('1.0.0').bumpFrom(v('0.9.3')), 'major');
  assert.equal(v('0.2.4').bumpFrom(v('0.2.4')), 'none');
});

test('bumpFrom calls skipped or mixed steps irregular', () => {
  assert.equal(v('0.4.0').bumpFrom(v('0.2.0')), 'irregular');
  assert.equal(v('0.3.1').bumpFrom(v('0.2.0')), 'irregular');
  assert.equal(v('0.1.0').bumpFrom(v('0.2.0')), 'irregular');
});

test('tag is the version prefixed with v', () => {
  assert.equal(v('0.2.0').tag, 'v0.2.0');
});
