import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpaceCollapse } from '../../src/core/SpaceCollapse.js';

test('shares one state per scope', () => {
  const scope = {};
  assert.equal(SpaceCollapse.of(scope), SpaceCollapse.of(scope));
  assert.notEqual(SpaceCollapse.of(scope), SpaceCollapse.of({}));
});

test('reports only real changes and stops reporting after unsubscribe', () => {
  const collapse = SpaceCollapse.of({});
  const seen: boolean[] = [];
  const stop = collapse.onChange((value) => void seen.push(value));
  collapse.set(false);
  collapse.set(true);
  collapse.set(true);
  assert.equal(collapse.collapsed, true);
  stop();
  collapse.set(false);
  assert.deepEqual(seen, [true]);
});
