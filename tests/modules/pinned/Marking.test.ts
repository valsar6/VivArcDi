import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { PinnedMarks } from '../../../src/modules/pinned/PinnedMarks.js';
import { TabBarMarker } from '../../../src/modules/pinned/TabBarMarker.js';
import { PINNED_LAST_ATTRIBUTE } from '../../../src/shared/tabs/TabBarMarks.js';
import { FakeNode, selectors, tabSlot } from '../favorites/fakes.js';
import { own } from '../favorites/linked.js';

const logger = (warnings: string[]): { warn: (...message: unknown[]) => void } => ({
  warn: (...message): void => void warnings.push(message.join(' ')),
});

const root = (children: FakeNode[]): ParentNode => new FakeNode([], children) as unknown as ParentNode;

test('does not mark a pinned tab that left its own page', () => {
  const marks = PinnedMarks.marksOf([
    { id: 1, pinned: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({}, 'r', 'https://www.reddit.com/') },
    { id: 2, pinned: true, url: 'https://docs.example/b', vivExtData: own({}, undefined, 'https://docs.example/a') },
    { id: 3, pinned: false, url: 'https://news.example/', vivExtData: own({}) },
  ] as unknown as chrome.tabs.Tab[]);
  assert.deepEqual([...marks.linked], [1]);
  const slots = [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true }), tabSlot(3)];
  const marker = new TabBarMarker(selectors);
  marker.apply(root([new FakeNode(['strip'], slots)]), marks);
  assert.ok(slots.every((slot) => !slot.hasAttribute('data-vivarcdi-away')));
  assert.ok(slots.slice(0, 2).every((slot) => slot.querySelector('pinned') !== null));
  assert.deepEqual(slots.map((slot) => slot.hasAttribute(PINNED_LAST_ATTRIBUTE)), [false, true, false]);
  marker.clear();
  assert.ok(slots.every((slot) => !slot.hasAttribute(PINNED_LAST_ATTRIBUTE)));
});

test('marks the separator after the last pinned row of a group beside the tab strip', () => {
  const rows = [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true }), tabSlot(3, { pinned: true })];
  const group = new FakeNode(['group'], rows);
  const today = [tabSlot(4), tabSlot(5)];
  const marker = new TabBarMarker(selectors);
  marker.apply(root([group, new FakeNode(['strip'], today)]), { linked: new Set([1]) });
  assert.deepEqual(rows.map((row) => row.hasAttribute(PINNED_LAST_ATTRIBUTE)), [false, false, true]);
  assert.deepEqual(today.map((row) => row.hasAttribute(PINNED_LAST_ATTRIBUTE)), [false, false]);
});

test('clears the marks of the rows of a group beside the tab strip', () => {
  const first = [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true })];
  const marker = new TabBarMarker(selectors);
  marker.apply(root([new FakeNode(['group'], first), new FakeNode(['strip'])]), { linked: new Set() });
  assert.equal(first[1]?.hasAttribute(PINNED_LAST_ATTRIBUTE), true);
  const last = [tabSlot(3, { pinned: true })];
  marker.apply(root([new FakeNode(['group'], last), new FakeNode(['strip'])]), { linked: new Set() });
  assert.ok(first.every((row) => !row.hasAttribute(PINNED_LAST_ATTRIBUTE)));
  assert.equal(last[0]?.hasAttribute(PINNED_LAST_ATTRIBUTE), true);
});

test('keeps marking the strip when the catalog has no pinned group', () => {
  const catalog = new SelectorCatalog({ tabStrip: 'strip', pinnedTab: 'pinned', tabWrapper: 'wrapper' }, 'test');
  const rows = [tabSlot(1, { pinned: true }), tabSlot(2, { pinned: true }), tabSlot(3)];
  const marker = new TabBarMarker(catalog);
  marker.apply(root([new FakeNode(['strip'], rows)]), { linked: new Set() });
  assert.deepEqual(rows.map((row) => row.hasAttribute(PINNED_LAST_ATTRIBUTE)), [false, true, false]);
});

test('does not warn when the strip is missing but a group exists', () => {
  const warnings: string[] = [];
  const rows = [tabSlot(1, { pinned: true })];
  const marker = new TabBarMarker(selectors, logger(warnings));
  marker.apply(root([new FakeNode(['group'], rows)]), { linked: new Set() });
  assert.deepEqual(warnings, []);
  assert.equal(rows[0]?.hasAttribute(PINNED_LAST_ATTRIBUTE), true);
});

test('warns once when neither the strip nor a group matches', () => {
  const warnings: string[] = [];
  const marker = new TabBarMarker(selectors, logger(warnings));
  marker.apply(root([]), { linked: new Set() });
  marker.apply(root([]), { linked: new Set() });
  assert.deepEqual(warnings, ['The tab strip is missing: pinned rows are left as Vivaldi draws them']);
});
