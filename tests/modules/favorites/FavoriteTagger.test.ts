import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVORITE_ATTRIBUTE,
  FavoriteTagger,
  GRID_ATTRIBUTE,
  UNLOADED_ATTRIBUTE,
} from '../../../src/modules/favorites/FavoriteTagger.js';
import { asElement, selectors, tabBar, tabSlot } from './fakes.js';
import type { FakeNode } from './fakes.js';

const none = { has: (): boolean => false };
const tileIds = (strip: FakeNode): Array<number | null> =>
  strip.children
    .filter((slot) => slot.hasAttribute(FAVORITE_ATTRIBUTE))
    .map((slot) => FavoriteTagger.tabIdOf(asElement(slot), 'wrapper'));

test('pinned tabs of a vertical tab bar become tiles', () => {
  const { bar, strip } = tabBar({
    slots: [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true }), tabSlot(3)],
  });
  assert.equal(new FavoriteTagger(selectors, 12, none).apply(asElement(bar)), asElement(strip));
  assert.ok(strip.hasAttribute(GRID_ATTRIBUTE));
  assert.deepEqual(tileIds(strip), [1, 2]);
});

test('pinned tabs beyond the limit stay rows', () => {
  const { bar, strip } = tabBar({
    slots: [1, 2, 3, 4].map((id) => tabSlot(id, { pinned: true })),
  });
  new FavoriteTagger(selectors, 3, none).apply(asElement(bar));
  assert.deepEqual(tileIds(strip), [1, 2, 3]);
});

test('a horizontal tab bar gets no grid', () => {
  const { bar, strip } = tabBar({ vertical: false, slots: [tabSlot(1, { pinned: true })] });
  assert.equal(new FavoriteTagger(selectors, 12, none).apply(asElement(bar)), null);
  assert.equal(strip.hasAttribute(GRID_ATTRIBUTE), false);
  assert.deepEqual(tileIds(strip), []);
});

test('turning the tab bar horizontal removes the marks', () => {
  const { bar, strip } = tabBar({ slots: [tabSlot(1, { pinned: true })] });
  const tagger = new FavoriteTagger(selectors, 12, none);
  tagger.apply(asElement(bar));
  bar.selectorNames.delete('vertical');
  tagger.apply(asElement(bar));
  assert.equal(strip.hasAttribute(GRID_ATTRIBUTE), false);
  assert.deepEqual(tileIds(strip), []);
});

test('unpinning a tab turns its tile back into a row', () => {
  const pinnedSlot = tabSlot(1, { pinned: true });
  const { bar, strip } = tabBar({ slots: [pinnedSlot] });
  const tagger = new FavoriteTagger(selectors, 12, none);
  tagger.apply(asElement(bar));
  pinnedSlot.children[0]?.selectorNames.delete('pinned');
  tagger.apply(asElement(bar));
  assert.deepEqual(tileIds(strip), []);
});

test('tiles of unloaded tabs are marked', () => {
  const { bar, strip } = tabBar({
    slots: [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true }), tabSlot(3)],
  });
  new FavoriteTagger(selectors, 12, new Set([2, 3])).apply(asElement(bar));
  const unloaded = strip.children.map((slot) => slot.hasAttribute(UNLOADED_ATTRIBUTE));
  assert.deepEqual(unloaded, [false, true, false]);
});

test('tabIdOf reads the Vivaldi tab id', () => {
  assert.equal(FavoriteTagger.tabIdOf(asElement(tabSlot(42)), 'wrapper'), 42);
  assert.equal(FavoriteTagger.tabIdOf(asElement(tabBar().strip), 'wrapper'), null);
});
