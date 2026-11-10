import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PinnedMerge } from '../../../src/modules/workspacesync/PinnedMerge.js';

test('joins the store and this computer on the first run', () => {
  assert.deepEqual(PinnedMerge.merge({ local: ['a', 'x'], store: ['b', 'a'], base: null }), ['b', 'a', 'x']);
  assert.deepEqual(PinnedMerge.merge({ local: [], store: [], base: null }), []);
});

test('keeps what each side added since the base', () => {
  assert.deepEqual(PinnedMerge.merge({ local: ['a', 'x'], store: ['a', 'y'], base: ['a'] }), ['a', 'y', 'x']);
});

test('puts a tab added elsewhere at its place in the store', () => {
  assert.deepEqual(PinnedMerge.merge({ local: ['a', 'b'], store: ['a', 'n', 'b'], base: ['a', 'b'] }), ['a', 'n', 'b']);
});

test('drops what either side removed since the base', () => {
  assert.deepEqual(PinnedMerge.merge({ local: ['a', 'c'], store: ['b', 'c'], base: ['a', 'b', 'c'] }), ['c']);
});

test('takes the order of the side that changed it, and the store when both did', () => {
  assert.deepEqual(PinnedMerge.merge({ local: ['b', 'a', 'c'], store: ['a', 'b', 'c'], base: ['a', 'b', 'c'] }), ['b', 'a', 'c']);
  assert.deepEqual(PinnedMerge.merge({ local: ['a', 'b', 'c'], store: ['c', 'a', 'b'], base: ['a', 'b', 'c'] }), ['c', 'a', 'b']);
  assert.deepEqual(PinnedMerge.merge({ local: ['b', 'a', 'c'], store: ['c', 'a', 'b'], base: ['a', 'b', 'c'] }), ['c', 'a', 'b']);
});

test('finds nothing to do when the three lists are equal', () => {
  const same = ['a', 'b', 'c'];
  assert.deepEqual(PinnedMerge.merge({ local: [...same], store: [...same], base: [...same] }), same);
});
