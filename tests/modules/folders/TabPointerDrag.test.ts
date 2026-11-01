import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabPointerDrag } from '../../../src/modules/folders/TabPointerDrag.js';
import { DomDocument, asDocument } from '../../core/dom.js';

const WRAPPER = '.wrapper';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

function setup(): { dom: DomDocument; events: string[]; down: (x: number, y: number, target?: unknown, button?: number) => void; move: (x: number, y: number, buttons?: number) => void; up: (x: number, y: number) => void } {
  const dom = new DomDocument();
  const events: string[] = [];
  new TabPointerDrag({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    onMove: (x, y): void => void events.push(`move ${x},${y}`),
    onDrop: (tabId, x, y): void => void events.push(`drop ${tabId} ${x},${y}`),
    onEnd: (): void => void events.push('end'),
  }).attach();
  return {
    dom,
    events,
    down: (x, y, target = rowOf(7), button = 0): void => dom.emit('mousedown', { button, buttons: 1, clientX: x, clientY: y, target }),
    move: (x, y, buttons = 1): void => dom.emit('mousemove', { buttons, clientX: x, clientY: y }),
    up: (x, y): void => dom.emit('mouseup', { buttons: 0, clientX: x, clientY: y }),
  };
}

test('reports the tab and the point where the button is released after a drag', () => {
  const { events, down, move, up } = setup();
  down(10, 10);
  move(12, 12);
  move(10, 40);
  move(60, 80);
  up(60, 80);
  assert.deepEqual(events, ['move 10,40', 'move 60,80', 'drop 7 60,80', 'end']);
});

test('a click that barely moves is not a drag', () => {
  const { events, down, move, up } = setup();
  down(10, 10);
  move(13, 12);
  up(13, 12);
  assert.deepEqual(events, []);
});

test('follows only the primary button on a tab row', () => {
  const { events, down, move, up } = setup();
  down(10, 10, rowOf(7), 2);
  move(10, 90);
  up(10, 90);
  down(10, 10, { closest: (): null => null });
  move(10, 90);
  up(10, 90);
  assert.deepEqual(events, []);
});

test('forgets a drag whose button was released out of the window and never cancels an event', () => {
  const { dom, events, down, move } = setup();
  down(10, 10);
  move(10, 90);
  move(10, 95, 0);
  move(10, 99);
  assert.deepEqual(events, ['move 10,90', 'end']);
  let prevented = false;
  dom.emit('mousemove', { buttons: 1, clientX: 0, clientY: 0, preventDefault: (): void => void (prevented = true) });
  assert.equal(prevented, false);
});

test('stops listening after detach', () => {
  const dom = new DomDocument();
  const drag = new TabPointerDrag({ document: asDocument(dom), wrapperSelector: WRAPPER, onMove: (): void => undefined, onDrop: (): void => undefined, onEnd: (): void => undefined });
  drag.attach();
  drag.detach();
  assert.deepEqual([...dom.listeners.values()], [[], [], []]);
});
