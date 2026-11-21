import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuItem } from '../../../src/core/dom/ContextMenu.js';
import { TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { TileMenu } from '../../../src/modules/favorites/TileMenu.js';
import { asDocument, asElement, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

function setup(): { dom: DomDocument; grid: DomNode; tile: DomNode; opened: string[][]; items: () => MenuItem[]; calls: string[] } {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  const tile = dom.createElement('div');
  tile.setAttribute(TILE_ATTRIBUTE, 'f1');
  grid.append(tile);
  const opened: string[][] = [];
  let last: MenuItem[] = [];
  const calls: string[] = [];
  new TileMenu({
    document: asDocument(dom),
    grid: (): HTMLElement => asElement(grid),
    menu: {
      open: (items): void => {
        last = items;
        opened.push(items.map((item) => item.label ?? ''));
      },
      close: (): void => undefined,
    },
    removal: { untile: async (id): Promise<void> => void calls.push(`untile ${id}`), pin: async (id): Promise<void> => void calls.push(`pin ${id}`) },
  }).attach();
  return { dom, grid, tile, opened, items: (): MenuItem[] => last, calls };
}

const rightClick = (dom: DomDocument, target: unknown): number => {
  let prevented = 0;
  dom.emit('contextmenu', { target, clientX: 1, clientY: 2, preventDefault: (): number => (prevented += 1), stopPropagation: (): void => undefined });
  return prevented;
};

test('opens the menu of a tile with Untile tab and Pin tab', () => {
  const { dom, tile, opened, items, calls } = setup();
  assert.equal(rightClick(dom, tile), 1);
  assert.deepEqual(opened, [['Untile tab', 'Pin tab']]);
  items().forEach((item) => {
    if ('run' in item) {
      item.run();
    }
  });
  assert.deepEqual(calls, ['untile f1', 'pin f1']);
});

test('leaves the menu of anything but a tile of the grid to Vivaldi', () => {
  const { dom, opened } = setup();
  const pinned = dom.createElement('div');
  pinned.setAttribute(TILE_ATTRIBUTE, 'pinned');
  dom.parent.append(pinned);
  assert.equal(rightClick(dom, pinned), 0);
  assert.equal(rightClick(dom, dom.createElement('div')), 0);
  assert.deepEqual(opened, []);
});

test('adds the web panel command after Pin tab when there is one', async () => {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  const tile = dom.createElement('div');
  tile.setAttribute(TILE_ATTRIBUTE, 'f1');
  grid.append(tile);
  const opened: string[][] = [];
  new TileMenu({
    document: asDocument(dom),
    grid: (): HTMLElement => asElement(grid),
    menu: { open: (items): void => void opened.push(items.map((item) => item.label ?? '')), close: (): void => undefined },
    removal: { untile: async (): Promise<void> => undefined, pin: async (): Promise<void> => undefined },
    panels: { item: async (id): Promise<{ label: string; run: () => void } | null> => (id === 'f1' ? { label: 'Open as web panel', run: (): void => undefined } : null) },
  }).attach();
  rightClick(dom, tile);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(opened, [['Untile tab', 'Pin tab', 'Open as web panel']]);
});
