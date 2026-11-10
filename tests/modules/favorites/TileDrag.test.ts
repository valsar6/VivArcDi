import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { DRAGGING_ATTRIBUTE, TileDrag } from '../../../src/modules/favorites/TileDrag.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

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
  tile.setAttribute(TILE_ATTRIBUTE, 'f1');
  grid.append(tile);
  const events: string[] = [];
  new TileDrag({
    document: asDocument(dom),
    grid: (): HTMLElement => asElement(grid),
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
  outside.setAttribute(TILE_ATTRIBUTE, 'x');
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
  const detached = new TileDrag({ document: asDocument(dom), grid: (): null => null, onMove: (): void => undefined, onDrop: (): void => undefined, onEnd: (): void => undefined });
  detached.attach();
  detached.detach();
  assert.equal([...dom.listeners.values()].flat().length, 0);
});
