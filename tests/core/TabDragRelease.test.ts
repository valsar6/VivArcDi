import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabDragRelease } from '../../src/core/TabDragRelease.js';
import { TAB_ENTRIES_TYPE } from '../../src/core/TabEntries.js';
import { DomDocument, asDocument } from './dom.js';

const WRAPPER = '.wrapper';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

function setup(): { dom: DomDocument; log: string[]; release: TabDragRelease<string> } {
  const dom = new DomDocument();
  const log: string[] = [];
  const release = new TabDragRelease<string>({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    place: {
      at: (x): string | null => (x < 100 ? 'here' : null),
      mark: (target): void => void log.push(`mark ${target}`),
      clear: (): void => void log.push('clear'),
      release: (tabId, target): void => void log.push(`release ${tabId} ${target}`),
    },
  });
  release.start();
  return { dom, log, release };
}

const press = (dom: DomDocument, tabId: number): void => dom.emit('mousedown', { button: 0, buttons: 1, clientX: 500, clientY: 500, target: rowOf(tabId) });
const html5 = (dom: DomDocument, type: string, x: number): void => dom.emit(type, { clientX: x, clientY: 0, dataTransfer: { types: [TAB_ENTRIES_TYPE] }, preventDefault: (): void => undefined });

test('releases a tab dropped with the mouse over a target', () => {
  const { dom, log } = setup();
  press(dom, 3);
  dom.emit('mousemove', { buttons: 1, clientX: 50, clientY: 0 });
  dom.emit('mouseup', { buttons: 0, clientX: 50, clientY: 0 });
  assert.deepEqual(log, ['mark here', 'release 3 here', 'clear']);
});

test('releases a tab dropped with html5 once for each press', () => {
  const { dom, log } = setup();
  press(dom, 3);
  html5(dom, 'drop', 50);
  html5(dom, 'drop', 50);
  press(dom, 4);
  html5(dom, 'drop', 50);
  assert.deepEqual(log.filter((entry) => entry.startsWith('release')), ['release 3 here', 'release 4 here']);
});

test('does not release a drop outside every target', () => {
  const { dom, log } = setup();
  press(dom, 3);
  html5(dom, 'dragover', 300);
  html5(dom, 'drop', 300);
  assert.deepEqual(log, ['clear', 'clear']);
});

test('removes the marks and stops listening on stop', () => {
  const { dom, log, release } = setup();
  release.stop();
  assert.deepEqual(log, ['clear']);
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('leaves the marks of a drag that carries no tab', () => {
  const { dom, log } = setup();
  dom.emit('dragover', { clientX: 50, clientY: 0, dataTransfer: { types: ['text/plain'] }, preventDefault: (): void => undefined });
  dom.emit('dragover', { clientX: 300, clientY: 0, dataTransfer: { types: ['text/plain'] }, preventDefault: (): void => undefined });
  assert.deepEqual(log, []);
});
