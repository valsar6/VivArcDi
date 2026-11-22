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

function menuWith(links: { items: (id: string) => Promise<MenuItem[]> } | undefined, opened: MenuItem[][]): { dom: DomDocument; tile: DomNode } {
  const dom = new DomDocument();
  const grid = dom.createElement('div');
  const tile = dom.createElement('div');
  tile.setAttribute(TILE_ATTRIBUTE, 'f1');
  grid.append(tile);
  new TileMenu({
    document: asDocument(dom),
    grid: (): HTMLElement => asElement(grid),
    menu: { open: (items): void => void opened.push(items), close: (): void => undefined },
    removal: { untile: async (): Promise<void> => undefined, pin: async (): Promise<void> => undefined },
    links,
  }).attach();
  return { dom, tile };
}

const labels = (items: MenuItem[]): string[] => items.map((item) => item.label ?? '-');

test('puts the link commands before Untile tab', async () => {
  const opened: MenuItem[][] = [];
  const asked: string[] = [];
  const { dom, tile } = menuWith(
    {
      items: async (id): Promise<MenuItem[]> => {
        asked.push(id);
        return [{ label: 'Copy Link', run: (): void => undefined }, { separator: true }, { label: 'Duplicate', run: (): void => undefined }];
      },
    },
    opened,
  );
  rightClick(dom, tile);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(asked, ['f1']);
  assert.deepEqual(opened.map(labels), [['Copy Link', '-', 'Duplicate', '-', 'Untile tab', 'Pin tab']]);
});

test('leaves the menu as it was without link commands', async () => {
  const opened: MenuItem[][] = [];
  const none = menuWith(undefined, opened);
  rightClick(none.dom, none.tile);
  const empty = menuWith({ items: async (): Promise<MenuItem[]> => [] }, opened);
  rightClick(empty.dom, empty.tile);
  const failing = menuWith({ items: async (): Promise<MenuItem[]> => Promise.reject(new Error('no bookmark')) }, opened);
  rightClick(failing.dom, failing.tile);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(opened.map(labels), [
    ['Untile tab', 'Pin tab'],
    ['Untile tab', 'Pin tab'],
    ['Untile tab', 'Pin tab'],
  ]);
});
