import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpaceMenuItems } from '../../src/core/SpaceMenuItems.js';

test('shares one registry per scope', () => {
  const scope = {};
  assert.equal(SpaceMenuItems.of(scope), SpaceMenuItems.of(scope));
  assert.notEqual(SpaceMenuItems.of(scope), SpaceMenuItems.of({}));
});

test('gives the items of every provider in the order they were added, asking each time', () => {
  const registry = SpaceMenuItems.of({});
  let asked = 0;
  registry.add(() => {
    asked += 1;
    return [{ label: 'First', run: (): void => undefined }];
  });
  registry.add(() => [{ label: 'Second', items: [] }]);
  assert.deepEqual(registry.items().map((item) => item.label), ['First', 'Second']);
  registry.items();
  assert.equal(asked, 2);
});

test('stops giving the items of a provider that was removed', () => {
  const registry = SpaceMenuItems.of({});
  const remove = registry.add(() => [{ label: 'Gone', run: (): void => undefined }]);
  remove();
  assert.deepEqual(registry.items(), []);
});
