import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HOVER_NAME_MS, NAME_ATTRIBUTE, TileHoverName } from '../../../src/modules/favorites/TileHoverName.js';
import { FavoritesView, TILE_ATTRIBUTE, TILE_LABEL_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

const WIDTH = 1000;
const HEIGHT = 800;
const LABEL_WIDTH = 120;
const LABEL_HEIGHT = 20;
const ABOUT_TO_SHOW = HOVER_NAME_MS - 1;
const CANCELLING = ['mousedown', 'contextmenu', 'dragstart', 'wheel'];

interface Setup {
  document: DomDocument;
  tile: DomNode;
  stop: () => void;
  names: () => DomNode[];
}

function setUp(t: TestContext, text = 'Chat'): Setup {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const document = new DomDocument();
  document.defaultView = { innerWidth: WIDTH, innerHeight: HEIGHT };
  const grid = document.createElement('div');
  const tile = document.createElement('div');
  tile.setAttribute(TILE_ATTRIBUTE, 'w');
  grid.append(tile);
  const hover = new TileHoverName({
    document: asDocument(document),
    parent: (): HTMLElement => asElement(document.parent),
    timers: {
      set: (run: () => void, ms: number): unknown => setTimeout(run, ms),
      clear: (handle: unknown): void => clearTimeout(handle as NodeJS.Timeout),
    },
  });
  const stop = hover.attach(asElement(grid), (): string => text);
  const names = (): DomNode[] => document.parent.children.filter((node) => node.hasAttribute(NAME_ATTRIBUTE));
  return { document, tile, stop, names };
}

const fire = (tile: DomNode, type: string, relatedTarget: DomNode | null = null): void =>
  tile.bubble({ type, target: tile, relatedTarget } as unknown as Event);

test('shows the name of a tile after a hover of three seconds', (t) => {
  const { tile, names } = setUp(t);
  tile.rect = { left: 40, right: 80, top: 100, bottom: 144 };
  fire(tile, 'mouseover');
  t.mock.timers.tick(ABOUT_TO_SHOW);
  assert.equal(names().length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(names().map((node) => node.textContent), ['Chat']);
  fire(tile, 'mouseout');
  assert.equal(names().length, 0);
});

test('shows no name when the pointer leaves before three seconds', (t) => {
  const { tile, names } = setUp(t);
  fire(tile, 'mouseover');
  t.mock.timers.tick(ABOUT_TO_SHOW);
  fire(tile, 'mouseout');
  t.mock.timers.tick(HOVER_NAME_MS);
  assert.equal(names().length, 0);
});

test('keeps the timer while the pointer moves inside the same tile', (t) => {
  const { tile, names } = setUp(t);
  const icon = tile.ownerDocument.createElement('img');
  tile.append(icon);
  fire(tile, 'mouseover');
  t.mock.timers.tick(ABOUT_TO_SHOW);
  fire(icon, 'mouseout', tile);
  t.mock.timers.tick(1);
  assert.equal(names().length, 1);
});

for (const type of CANCELLING) {
  test(`cancels and removes the name on ${type}`, (t) => {
    const { tile, names } = setUp(t);
    fire(tile, 'mouseover');
    t.mock.timers.tick(ABOUT_TO_SHOW);
    fire(tile, type);
    t.mock.timers.tick(HOVER_NAME_MS);
    assert.equal(names().length, 0);
    fire(tile, 'mouseover');
    t.mock.timers.tick(HOVER_NAME_MS);
    assert.equal(names().length, 1);
    fire(tile, type);
    assert.equal(names().length, 0);
  });
}

test('places the name below the tile, no-drag and clamped to the window', (t) => {
  const { document, tile, names } = setUp(t);
  const createElement = document.createElement.bind(document);
  document.createElement = (tagName: string): DomNode => {
    const node = createElement(tagName);
    node.rect = { left: 0, right: LABEL_WIDTH, top: 0, bottom: LABEL_HEIGHT };
    return node;
  };
  tile.rect = { left: 40, right: 80, top: 100, bottom: 144 };
  fire(tile, 'mouseover');
  t.mock.timers.tick(HOVER_NAME_MS);
  assert.deepEqual([names()[0]?.properties.get('left'), names()[0]?.properties.get('top')], ['40px', '152px']);
  fire(tile, 'mouseout');
  tile.rect = { left: 980, right: 1020, top: 770, bottom: 800 };
  fire(tile, 'mouseover');
  t.mock.timers.tick(HOVER_NAME_MS);
  assert.deepEqual([names()[0]?.properties.get('left'), names()[0]?.properties.get('top')], ['872px', '742px']);
});

test('stopping removes the listeners and the name', (t) => {
  const { tile, stop, names } = setUp(t);
  fire(tile, 'mouseover');
  t.mock.timers.tick(HOVER_NAME_MS);
  stop();
  assert.equal(names().length, 0);
  fire(tile, 'mouseover');
  t.mock.timers.tick(HOVER_NAME_MS);
  assert.equal(names().length, 0);
});

test('a tile of the view has no native title and carries its text', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const document = new DomDocument();
  const view = new FavoritesView(asDocument(document), { open: (): void => undefined, unload: (): void => undefined });
  view.show([{ id: 'w', title: 'WhatsApp', url: 'https://web.whatsapp.com/' }]);
  const [tile] = (view.element as unknown as DomNode).children;
  assert.equal((tile as unknown as { title?: string }).title, undefined);
  assert.equal(tile?.getAttribute(TILE_LABEL_ATTRIBUTE), 'WhatsApp');
  view.destroy();
});
