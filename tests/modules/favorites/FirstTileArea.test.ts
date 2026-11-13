import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabBarAnchor } from '../../../src/core/dom/TabBarAnchor.js';
import { FIRST_TILE_ATTRIBUTE, FirstTileArea, OPEN_ATTRIBUTE } from '../../../src/modules/favorites/FirstTileArea.js';
import { GridDropZone } from '../../../src/modules/favorites/GridDropZone.js';
import { TabToFavorite } from '../../../src/modules/favorites/TabToFavorite.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { silentLogger } from '../reopen/fakes.js';

const HEADER_ORDER = 15;

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

interface Setup {
  dom: DomDocument;
  area: FirstTileArea;
  header: DomNode;
  added: Array<[number, string | null]>;
  down: (tabId: number) => void;
  drag: (x: number, y: number) => void;
  release: (x: number, y: number) => void;
}

function setup(): Setup {
  const dom = new DomDocument();
  const anchor = new TabBarAnchor(asDocument(dom), '.list', (): (() => void) => () => undefined, { schedule: (run): void => run(), cancel: (): void => undefined });
  const header = dom.createElement('div');
  anchor.add(asElement(header), HEADER_ORDER);
  const area = new FirstTileArea({ document: asDocument(dom), hostSelector: '.list', anchor });
  const added: Array<[number, string | null]> = [];
  const zone = new GridDropZone({ document: asDocument(dom), grid: (): null => null, below: (): null => null, empty: (): HTMLElement | null => area.element });
  new TabToFavorite({
    document: asDocument(dom),
    wrapperSelector: '.wrapper',
    zone,
    drop: { add: async (tabId, beforeId): Promise<'added'> => (added.push([tabId, beforeId]), 'added') },
    tabs: { get: async (id): Promise<chrome.tabs.Tab> => ({ id, title: 'Page' }) as chrome.tabs.Tab },
    pill: { show: (): void => undefined, move: (): void => undefined, hide: (): void => undefined },
    logger: silentLogger(),
  }).start();
  return {
    dom,
    area,
    header,
    added,
    down: (tabId) => dom.emit('mousedown', { button: 0, buttons: 1, clientX: 500, clientY: 500, target: rowOf(tabId) }),
    drag: (x, y) => dom.emit('mousemove', { buttons: 1, clientX: x, clientY: y }),
    release: (x, y) => dom.emit('mouseup', { buttons: 0, clientX: x, clientY: y }),
  };
}

const placed = (area: FirstTileArea): DomNode => {
  const element = area.element as unknown as DomNode | null;
  assert.ok(element);
  element.rect = { left: 0, right: 300, top: 40, bottom: 48 };
  return element;
};

const settle = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('keeps a tile drop area above the space header only while the grid is empty', () => {
  const { area, header } = setup();
  area.place(true);
  const element = placed(area);
  assert.ok(element.hasAttribute(FIRST_TILE_ATTRIBUTE));
  assert.equal(element.nextElementSibling, header);
  area.place(false);
  assert.equal(area.element, null);
  assert.equal(element.parentElement, null);
});

test('opens the tile drop area while a tab is over it', () => {
  const { area, down, drag, release } = setup();
  area.place(true);
  const element = placed(area);
  down(7);
  drag(150, 200);
  assert.equal(element.hasAttribute(OPEN_ATTRIBUTE), false);
  drag(150, 44);
  assert.equal(element.hasAttribute(OPEN_ATTRIBUTE), true);
  drag(150, 200);
  assert.equal(element.hasAttribute(OPEN_ATTRIBUTE), false);
  drag(150, 44);
  release(150, 200);
  assert.equal(element.hasAttribute(OPEN_ATTRIBUTE), false);
});

test('makes the first tile from a tab dropped above the space header', async () => {
  const { area, added, down, drag, release } = setup();
  area.place(true);
  placed(area);
  down(7);
  drag(150, 44);
  release(150, 44);
  await settle();
  assert.deepEqual(added, [[7, null]]);
});
