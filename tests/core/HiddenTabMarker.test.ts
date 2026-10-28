import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabMarker } from '../../src/core/HiddenTabMarker.js';
import { HiddenTabs } from '../../src/core/HiddenTabs.js';
import { FakeNode, selectors } from '../modules/favorites/fakes.js';

const slot = (id: number): FakeNode => {
  const wrapper = new FakeNode(['wrapper']);
  wrapper.dataset['id'] = `tab-${id}`;
  return new FakeNode([], [wrapper]);
};

const markerOver = (slots: FakeNode[], hidden: HiddenTabs): HiddenTabMarker => {
  const strip = new FakeNode(['strip'], slots);
  const document = { querySelector: (selector: string): FakeNode | null => (selector === 'strip' ? strip : null) } as unknown as Document;
  return new HiddenTabMarker(document, selectors, hidden);
};

test('collapses the slot of a hidden tab with an inline style', () => {
  const slots = [slot(1), slot(2)];
  const hidden = new HiddenTabs();
  hidden.set('bookmark-folders', [1]);
  markerOver(slots, hidden).apply();
  assert.deepEqual(
    slots.map((node) => node.properties.get('display')),
    ['none', undefined],
  );
});

test('shows the slot again when its tab is no longer hidden', () => {
  const slots = [slot(1)];
  const hidden = new HiddenTabs();
  const marker = markerOver(slots, hidden);
  hidden.set('bookmark-folders', [1]);
  marker.apply();
  hidden.clear('bookmark-folders');
  marker.apply();
  assert.equal(slots[0]?.properties.has('display'), false);
  assert.equal(slots[0]?.hasAttribute('data-vivarcdi-hidden'), false);
});

test('marks the slot of a hidden tab and collapses it together', () => {
  const slots = [slot(1)];
  const hidden = new HiddenTabs();
  hidden.set('bookmark-folders', [1]);
  markerOver(slots, hidden).apply();
  assert.deepEqual([slots[0]?.hasAttribute('data-vivarcdi-hidden'), slots[0]?.properties.get('display')], [true, 'none']);
});

test('keeps the slot collapsed while another module still hides its tab', () => {
  const slots = [slot(1)];
  const hidden = new HiddenTabs();
  const marker = markerOver(slots, hidden);
  hidden.set('favorites-grid', [1]);
  hidden.set('bookmark-folders', [1]);
  marker.apply();
  hidden.clear('favorites-grid');
  marker.apply();
  assert.equal(slots[0]?.properties.get('display'), 'none');
});

test('collapses the slot of a tab that shows up after the first pass', () => {
  const slots = [slot(1)];
  const strip = new FakeNode(['strip'], slots);
  const document = { querySelector: (selector: string): FakeNode | null => (selector === 'strip' ? strip : null) } as unknown as Document;
  const hidden = new HiddenTabs();
  hidden.set('bookmark-folders', [2]);
  const marker = new HiddenTabMarker(document, selectors, hidden);
  marker.apply();
  const late = slot(2);
  strip.children.push(late);
  marker.apply();
  assert.deepEqual([slots[0]?.properties.has('display'), late.properties.get('display')], [false, 'none']);
});

test('leaves the display of a slot it did not collapse alone', () => {
  const slots = [slot(1)];
  slots[0]?.properties.set('display', 'contents');
  markerOver(slots, new HiddenTabs()).apply();
  assert.equal(slots[0]?.properties.get('display'), 'contents');
});
