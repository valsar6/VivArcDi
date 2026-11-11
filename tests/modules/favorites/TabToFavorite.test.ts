import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAB_ENTRIES_TYPE } from '../../../src/core/TabEntries.js';
import { GAP_ATTRIBUTE, GridDropZone } from '../../../src/modules/favorites/GridDropZone.js';
import { TabToFavorite } from '../../../src/modules/favorites/TabToFavorite.js';
import { TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const WRAPPER = '.wrapper';

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

interface Setup {
  dom: DomDocument;
  grid: DomNode;
  below: DomNode;
  tiles: DomNode[];
  added: Array<[number, string | null]>;
  down: (tabId: number) => void;
  drag: (x: number, y: number) => void;
  release: (x: number, y: number) => void;
}

function setup(): Setup {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  grid.rect = { left: 0, right: 300, top: 0, bottom: 100 };
  const tiles = ['a', 'b', 'c'].map((id, index) => {
    const tile = dom.createElement('div');
    tile.setAttribute(TILE_ATTRIBUTE, id);
    tile.rect = { left: index * 100, right: index * 100 + 90, top: 0, bottom: 44 };
    return tile;
  });
  grid.append(...tiles);
  dom.parent.append(grid);
  const below = dom.createElement('div');
  below.rect = { left: 0, right: 300, top: 100, bottom: 160 };
  dom.parent.append(below);
  const added: Array<[number, string | null]> = [];
  const zone = new GridDropZone({ document: asDocument(dom), grid: (): HTMLElement => asElement(grid), below: (): HTMLElement => asElement(below) });
  new TabToFavorite({
    document: asDocument(dom),
    wrapperSelector: WRAPPER,
    zone,
    drop: { add: async (tabId, beforeId): Promise<'added'> => (added.push([tabId, beforeId]), 'added') },
  }).start();
  return {
    dom,
    grid,
    below,
    tiles,
    added,
    down: (tabId) => dom.emit('mousedown', { button: 0, buttons: 1, clientX: 500, clientY: 500, target: rowOf(tabId) }),
    drag: (x, y) => dom.emit('mousemove', { buttons: 1, clientX: x, clientY: y }),
    release: (x, y) => dom.emit('mouseup', { buttons: 0, clientX: x, clientY: y }),
  };
}

const gapIn = (grid: DomNode): DomNode | undefined => grid.children.find((child) => child.hasAttribute(GAP_ATTRIBUTE));

test('shows the gap before the tile under the pointer and removes it on release', () => {
  const { grid, tiles, added, down, drag, release } = setup();
  down(7);
  drag(150, 20);
  assert.deepEqual(grid.children.map((child) => child.getAttribute(TILE_ATTRIBUTE) ?? 'gap'), ['a', 'gap', 'b', 'c']);
  drag(10, 20);
  assert.equal(grid.children.indexOf(gapIn(grid) as DomNode), 0);
  release(150, 20);
  assert.equal(gapIn(grid), undefined);
  assert.deepEqual(grid.children, tiles);
  assert.deepEqual(added, [[7, 'b']]);
});

test('puts the gap at the end of the grid and drops at the end after the last tile', () => {
  const { grid, added, down, drag, release } = setup();
  down(7);
  drag(250, 80);
  assert.equal(gapIn(grid)?.nextElementSibling, null);
  release(250, 80);
  assert.deepEqual(added, [[7, null]]);
});

test('counts the pinned tiles under the grid as its end', () => {
  const { added, down, drag, release } = setup();
  down(7);
  drag(50, 120);
  release(50, 120);
  assert.deepEqual(added, [[7, null]]);
});

test('does nothing when the tab is released outside the grid', () => {
  const { grid, added, down, drag, release } = setup();
  down(7);
  drag(150, 20);
  drag(600, 600);
  assert.equal(gapIn(grid), undefined);
  release(600, 600);
  assert.deepEqual(added, []);
});

test('takes the html5 drop of a tab and answers the drag over', () => {
  const { dom, grid, added, down } = setup();
  down(9);
  let prevented = 0;
  const event = { clientX: 150, clientY: 20, dataTransfer: { types: [TAB_ENTRIES_TYPE, 'text/uri-list'] }, preventDefault: (): number => (prevented += 1) };
  dom.emit('dragover', event);
  assert.notEqual(gapIn(grid), undefined);
  dom.emit('drop', event);
  assert.equal(prevented, 2);
  assert.equal(gapIn(grid), undefined);
  assert.deepEqual(added, [[9, 'b']]);
});

test('ignores html5 drags that do not carry a tab', () => {
  const { dom, grid, added, down } = setup();
  down(9);
  let prevented = 0;
  const event = { clientX: 150, clientY: 20, dataTransfer: { types: ['text/uri-list'] }, preventDefault: (): number => (prevented += 1) };
  dom.emit('dragover', event);
  dom.emit('drop', event);
  assert.equal(prevented, 0);
  assert.equal(gapIn(grid), undefined);
  assert.deepEqual(added, []);
});

test('handles one release for each press', () => {
  const { dom, added, down, drag, release } = setup();
  down(7);
  drag(150, 20);
  release(150, 20);
  dom.emit('drop', { clientX: 150, clientY: 20, dataTransfer: { types: [TAB_ENTRIES_TYPE] }, preventDefault: (): void => undefined });
  assert.deepEqual(added, [[7, 'b']]);
  down(8);
  dom.emit('drop', { clientX: 150, clientY: 20, dataTransfer: { types: [TAB_ENTRIES_TYPE] }, preventDefault: (): void => undefined });
  assert.deepEqual(added, [[7, 'b'], [8, 'b']]);
});

test('ignores an html5 drop when the last press was not on a tab', () => {
  const { dom, added } = setup();
  dom.emit('mousedown', { button: 0, buttons: 1, clientX: 1, clientY: 1, target: { closest: (): null => null } });
  dom.emit('drop', { clientX: 150, clientY: 20, dataTransfer: { types: [TAB_ENTRIES_TYPE] }, preventDefault: (): void => undefined });
  assert.deepEqual(added, []);
});
