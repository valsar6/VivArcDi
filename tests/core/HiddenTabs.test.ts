import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabMarker, HIDDEN_ATTRIBUTE } from '../../src/core/HiddenTabMarker.js';
import { HiddenTabs } from '../../src/core/HiddenTabs.js';
import { FakeNode, selectors, tabSlot } from '../modules/favorites/fakes.js';

const immediate = { schedule: (run: () => void): void => run(), cancel: (): void => undefined };

function setup(): { hidden: HiddenTabs; strip: FakeNode; marker: HiddenTabMarker; changed: () => void } {
  const strip = new FakeNode(['strip'], [tabSlot(1), tabSlot(2), tabSlot(3)]);
  const browser = new FakeNode(['#browser']);
  const document = { querySelector: (selector: string): FakeNode | null => (selector === '#browser' ? browser : selector === 'strip' ? strip : null) } as unknown as Document;
  let notify = (): void => undefined;
  const hidden = new HiddenTabs();
  const watch = (_target: Node, onChange: () => void): (() => void) => {
    notify = onChange;
    return () => undefined;
  };
  const marker = new HiddenTabMarker(document, selectors, hidden, { watch, timing: immediate });
  return { hidden, strip, marker, changed: () => notify() };
}

const marks = (strip: FakeNode): boolean[] => strip.children.map((slot) => slot.hasAttribute(HIDDEN_ATTRIBUTE));

test('hides the union of what every owner hides', () => {
  const hidden = new HiddenTabs();
  hidden.set('favorites-grid', [1]);
  hidden.set('bookmark-folders', [2]);
  assert.deepEqual([1, 2, 3].map((id) => hidden.has(id)), [true, true, false]);
  hidden.clear('favorites-grid');
  assert.deepEqual([1, 2, 3].map((id) => hidden.has(id)), [false, true, false]);
});

test('tells the listeners only when the hidden tabs change', () => {
  const hidden = new HiddenTabs();
  let calls = 0;
  const remove = hidden.onChange(() => (calls += 1));
  hidden.set('a', [1, 2]);
  hidden.set('a', [2, 1]);
  hidden.clear('b');
  hidden.clear('a');
  remove();
  hidden.set('a', [1]);
  assert.equal(calls, 2);
});

test('shares one set for the same scope', () => {
  const scope = {};
  assert.equal(HiddenTabs.of(scope), HiddenTabs.of(scope));
  assert.notEqual(HiddenTabs.of(scope), HiddenTabs.of({}));
});

test('marks the slots of hidden tabs and follows the set and the strip', () => {
  const { hidden, strip, marker, changed } = setup();
  marker.start();
  assert.deepEqual(marks(strip), [false, false, false]);
  hidden.set('bookmark-folders', [2]);
  assert.deepEqual(marks(strip), [false, true, false]);
  strip.children.push(tabSlot(2));
  strip.children.push(tabSlot(3));
  hidden.set('favorites-grid', [3]);
  changed();
  assert.deepEqual(marks(strip), [false, true, true, true, true]);
  hidden.clear('bookmark-folders');
  hidden.clear('favorites-grid');
  assert.deepEqual(marks(strip), [false, false, false, false, false]);
  marker.stop();
});
