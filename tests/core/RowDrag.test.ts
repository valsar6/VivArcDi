import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAG_PILL_ATTRIBUTE, DragPill } from '../../src/core/DragPill.js';
import { DRAGGING_ATTRIBUTE, RowDrag } from '../../src/core/RowDrag.js';
import { asDocument, asElement, DomDocument } from './dom.js';
import type { DomNode } from './dom.js';

const ROW_ATTRIBUTE = 'data-test-row';

interface Setup {
  dom: DomDocument;
  tile: DomNode;
  events: string[];
  down: (target?: unknown, button?: number) => void;
  move: (x: number, y: number, buttons?: number) => void;
  up: (x: number, y: number) => void;
  click: () => number;
}

function setup(): Setup {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  const tile = dom.createElement('div');
  tile.setAttribute(ROW_ATTRIBUTE, 'f1');
  grid.append(tile);
  const events: string[] = [];
  new RowDrag({
    document: asDocument(dom),
    container: (): HTMLElement => asElement(grid),
    selector: `[${ROW_ATTRIBUTE}]`,
    idAttribute: ROW_ATTRIBUTE,
    onMove: (id, x, y): void => void events.push(`move ${id} ${x},${y}`),
    onDrop: (id, x, y): void => void events.push(`drop ${id} ${x},${y}`),
    onEnd: (): void => void events.push('end'),
  }).attach();
  return {
    dom,
    tile,
    events,
    down: (target = tile, button = 0) => dom.emit('mousedown', { button, buttons: 1, clientX: 10, clientY: 10, target }),
    move: (x, y, buttons = 1) => dom.emit('mousemove', { buttons, clientX: x, clientY: y }),
    up: (x, y) => dom.emit('mouseup', { buttons: 0, clientX: x, clientY: y }),
    click: (): number => {
      let stopped = 0;
      dom.emit('click', { preventDefault: (): void => undefined, stopPropagation: (): number => (stopped += 1) });
      return stopped;
    },
  };
}

test('reports the Favorite and the point where a tile is released after a drag', () => {
  const { tile, events, down, move, up } = setup();
  down();
  move(13, 12);
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), false);
  move(10, 40);
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), true);
  move(60, 80);
  up(60, 80);
  assert.deepEqual(events, ['move f1 10,40', 'move f1 60,80', 'drop f1 60,80', 'end']);
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), false);
});

test('a click that barely moves is not a drag and is not swallowed', () => {
  const { events, down, move, up, click } = setup();
  down();
  move(13, 12);
  up(13, 12);
  assert.deepEqual(events, []);
  assert.equal(click(), 0);
});

test('swallows the click that follows a drag, once', () => {
  const { down, move, up, click } = setup();
  down();
  move(10, 40);
  up(10, 40);
  assert.equal(click(), 1);
  assert.equal(click(), 0);
});

test('a new press forgets a swallow that was not used', () => {
  const { down, move, up, click } = setup();
  down();
  move(10, 40);
  up(10, 40);
  down();
  up(10, 10);
  assert.equal(click(), 0);
});

test('follows only the primary button on a tile of the grid', () => {
  const { dom, events, down, move, up } = setup();
  down(undefined, 1);
  move(10, 40);
  up(10, 40);
  const outside = dom.createElement('div');
  outside.setAttribute(ROW_ATTRIBUTE, 'x');
  down(outside);
  move(10, 40);
  up(10, 40);
  down({ closest: (): null => null });
  move(10, 40);
  up(10, 40);
  assert.deepEqual(events, []);
});

test('ends the drag when the button was released outside the window', () => {
  const { tile, events, down, move } = setup();
  down();
  move(10, 40);
  move(20, 50, 0);
  assert.deepEqual(events, ['move f1 10,40', 'end']);
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), false);
});

test('stops listening on detach', () => {
  const dom = new DomDocument();
  const detached = new RowDrag({ document: asDocument(dom), container: (): null => null, selector: `[${ROW_ATTRIBUTE}]`, idAttribute: ROW_ATTRIBUTE, onMove: (): void => undefined, onDrop: (): void => undefined, onEnd: (): void => undefined });
  detached.attach();
  detached.detach();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

function withPill(): { dom: DomDocument; tile: DomNode; pill: () => DomNode | undefined; drag: (x: number, y: number) => void; release: (x: number, y: number) => void } {
  const dom = new DomDocument();
  dom.list.rect = { left: 0, right: 300, top: 0, bottom: 600 };
  const grid = dom.createElement('div');
  const tile = dom.createElement('div');
  tile.setAttribute(ROW_ATTRIBUTE, 'f1');
  tile.setAttribute('title', 'Example');
  grid.append(tile);
  const frames: Array<() => void> = [];
  const pill = new DragPill({ document: asDocument(dom), parentSelector: '#browser', tabBarSelector: '#bar', timing: { schedule: (run): number => frames.push(run) } });
  new RowDrag({
    document: asDocument(dom),
    container: (): HTMLElement => asElement(grid),
    selector: `[${ROW_ATTRIBUTE}]`,
    idAttribute: ROW_ATTRIBUTE,
    onMove: (): void => undefined,
    onDrop: (): void => undefined,
    onEnd: (): void => undefined,
    pill,
  }).attach();
  dom.emit('mousedown', { button: 0, buttons: 1, clientX: 10, clientY: 10, target: tile });
  return {
    dom,
    tile,
    pill: (): DomNode | undefined => dom.created.findLast((node) => node.hasAttribute(DRAG_PILL_ATTRIBUTE)),
    drag: (x, y): void => {
      dom.emit('mousemove', { buttons: 1, clientX: x, clientY: y });
      frames.splice(0).forEach((run) => run());
    },
    release: (x, y): void => dom.emit('mouseup', { buttons: 0, clientX: x, clientY: y }),
  };
}

test('shows a drag pill for a dragged row', () => {
  const { tile, pill, drag } = withPill();
  drag(13, 12);
  assert.equal(pill(), undefined);
  drag(10, 40);
  assert.equal(pill()?.parentElement === null, false);
  assert.equal(pill()?.descendants().find((node) => node.tagName === 'SPAN')?.textContent, 'Example');
  assert.equal(pill()?.properties.get('transform'), 'translate(22px, 52px)');
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), true);
});

test('removes the drag pill when the drag ends', () => {
  const { tile, pill, drag, release } = withPill();
  drag(10, 40);
  release(10, 40);
  assert.equal(pill()?.parentElement, null);
  assert.equal(tile.hasAttribute(DRAGGING_ATTRIBUTE), false);
});

test('removes the drag pill when the button was released outside the window', () => {
  const { dom, pill, drag } = withPill();
  drag(10, 40);
  dom.emit('mousemove', { buttons: 0, clientX: 20, clientY: 50 });
  assert.equal(pill()?.parentElement, null);
});

test('does not start a drag on an element that accepts refuses', () => {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  const refused = dom.createElement('div');
  refused.setAttribute(ROW_ATTRIBUTE, 'live:f1');
  const allowed = dom.createElement('div');
  allowed.setAttribute(ROW_ATTRIBUTE, '11');
  grid.append(refused, allowed);
  const events: string[] = [];
  new RowDrag({
    document: asDocument(dom),
    container: (): HTMLElement => asElement(grid),
    selector: `[${ROW_ATTRIBUTE}]`,
    idAttribute: ROW_ATTRIBUTE,
    accepts: (id): boolean => !id.startsWith('live:'),
    onMove: (id): void => void events.push(`move ${id}`),
    onDrop: (id): void => void events.push(`drop ${id}`),
    onEnd: (): void => void events.push('end'),
  }).attach();
  for (const target of [refused, allowed]) {
    dom.emit('mousedown', { button: 0, buttons: 1, clientX: 10, clientY: 10, target });
    dom.emit('mousemove', { buttons: 1, clientX: 10, clientY: 40 });
    dom.emit('mouseup', { buttons: 0, clientX: 10, clientY: 40 });
  }
  assert.deepEqual(events, ['move 11', 'drop 11', 'end']);
  assert.equal(refused.hasAttribute(DRAGGING_ATTRIBUTE), false);
});
