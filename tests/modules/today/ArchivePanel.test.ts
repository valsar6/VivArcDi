import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArchiveGroups } from '../../../src/modules/today/ArchiveGroups.js';
import { ArchivePanelView } from '../../../src/modules/today/ArchivePanelView.js';
import { ArchiveSearch } from '../../../src/modules/today/ArchiveSearch.js';
import type { ArchiveEntry } from '../../../src/modules/today/ArchiveStore.js';
import { asDocument, asElement } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { event } from '../pinned/fakes.js';
import { HOUR, TodayDocument, entry } from './fakes.js';
import type { TodayNode } from './fakes.js';

const now = new Date(2026, 9, 28, 15, 0);
const ENTRIES = [
  entry('https://news.example/today', 'Morning news', now.getTime() - HOUR),
  entry('https://docs.example/guide', 'Vivaldi guide', now.getTime() - 20 * HOUR),
  entry('https://shop.example/cart', 'Cart', new Date(2026, 9, 20, 9, 0).getTime()),
];

test('archive search matches title and URL', () => {
  assert.deepEqual(ArchiveSearch.filter(ENTRIES, 'NEWS').map(({ title }) => title), ['Morning news']);
  assert.deepEqual(ArchiveSearch.filter(ENTRIES, 'shop.example').map(({ title }) => title), ['Cart']);
  assert.deepEqual(ArchiveSearch.filter(ENTRIES, ' vivaldi ').map(({ title }) => title), ['Vivaldi guide']);
  assert.equal(ArchiveSearch.filter(ENTRIES, 'nothing').length, 0);
  assert.equal(ArchiveSearch.filter(ENTRIES, '  ').length, 3);
});

test('groups entries by day as Today, Yesterday and the date', () => {
  const groups = ArchiveGroups.byDay(ENTRIES, now, 'en-US');
  assert.deepEqual(groups.map(({ label }) => label), ['Today', 'Yesterday', 'Oct 20, 2026']);
  assert.deepEqual(groups.map(({ entries }) => entries.length), [1, 1, 1]);
});

function setup(): { dom: TodayDocument; view: ArchivePanelView; restored: ArchiveEntry[]; closed: number[]; cleared: number[] } {
  const dom = new TodayDocument();
  dom.defaultView = { innerWidth: 1200, innerHeight: 800 };
  const restored: ArchiveEntry[] = [];
  const closed: number[] = [];
  const cleared: number[] = [];
  const view = new ArchivePanelView(
    asDocument(dom),
    asElement(dom.createElement('div')),
    { onRestore: (chosen): number => restored.push(chosen), onClose: (): number => closed.push(1), onArchiveToday: (): number => cleared.push(1) },
    'en-US',
  );
  view.open(ENTRIES, { top: 0, left: 0, right: 240, bottom: 800 } as DOMRect);
  return { dom, view, restored, closed, cleared };
}

const press = (panel: DomNode, key: string): void => panel.bubble(event('keydown', { key, target: panel }) as unknown as Event);
const rowsOf = (panel: DomNode): DomNode[] => panel.descendants().filter((node) => node.getAttribute('role') === 'option');

test('restores the highlighted entry with the keyboard and closes on Escape', () => {
  const { dom, restored, closed } = setup();
  const panel = dom.panel();
  assert.ok(panel);
  assert.equal(panel.children[1]?.focused, true);
  assert.equal(rowsOf(panel).length, 3);
  press(panel, 'ArrowDown');
  press(panel, 'Enter');
  assert.deepEqual(restored.map(({ title }) => title), ['Vivaldi guide']);
  press(panel, 'Escape');
  assert.equal(closed.length, 1);
});

test('typing in the search shows only the matching entries', () => {
  const { dom, restored } = setup();
  const panel = dom.panel();
  assert.ok(panel);
  const input = panel.children[1] as TodayNode;
  input.value = 'cart';
  input.listeners.get('input')?.forEach((listener) => listener(event('input') as unknown as Event));
  const rows = rowsOf(panel);
  assert.equal(rows.length, 1);
  rows[0]?.click();
  assert.deepEqual(restored.map(({ title }) => title), ['Cart']);
});

test('a click outside closes the panel, the header action archives Today tabs', () => {
  const { dom, view, closed, cleared } = setup();
  const panel = dom.panel();
  assert.ok(panel);
  const outside = dom.createElement('div');
  dom.emit('mousedown', { target: outside });
  assert.equal(closed.length, 1);
  dom.emit('mousedown', { target: rowsOf(panel)[0] });
  assert.equal(closed.length, 1);
  panel.descendants().find((node) => node.hasAttribute('data-vivarcdi-archive-today'))?.click();
  assert.equal(cleared.length, 1);
  view.close();
  assert.equal(dom.panel(), undefined);
  assert.equal(dom.listeners.get('mousedown')?.length, 0);
});
