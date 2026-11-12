import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabs } from '../../../src/shared/tabs/HiddenTabs.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { PinnedFavorites, TILE_SOURCE_ATTRIBUTE } from '../../../src/modules/favorites/PinnedFavorites.js';
import { TILE_ATTRIBUTE, CURRENT_ATTRIBUTE, DIMMED_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { SilentSink } from '../../loader/fakes.js';
import { FolderTabs } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { settle } from '../reopen/fakes.js';

const catalog = new SelectorCatalog({ browser: '#browser', tabListHost: '.list' }, 'test');
const inWorkspace = (id: number): string => JSON.stringify({ workspaceId: id });

class PinnedTabs extends FolderTabs {}

interface Setup {
  dom: DomDocument;
  tabs: PinnedTabs;
  hidden: HiddenTabs;
  favorites: PinnedFavorites;
  changes: number[];
}

function setup(t: TestContext, tabs: FolderTab[], maxTiles = 12): Setup {
  const frames = globalThis as unknown as Record<string, unknown>;
  frames['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => delete frames['MutationObserver']);
  const dom = new DomDocument();
  const fake = new PinnedTabs(tabs);
  const hidden = new HiddenTabs();
  const changes: number[] = [];
  const favorites = new PinnedFavorites({
    document: asDocument(dom),
    selectors: catalog,
    tabs: fake,
    logger: new Logger('test', new SilentSink()),
    maxTiles,
    hiddenTabs: hidden,
    onChange: (): void => void changes.push(1),
  });
  return { dom, tabs: fake, hidden, favorites, changes };
}

const pinned = (id: number, workspace = 7, extra: Partial<FolderTab> = {}): FolderTab => ({
  id,
  index: id,
  pinned: true,
  url: `https://site${id}.example/`,
  title: `Site ${id}`,
  vivExtData: inWorkspace(workspace),
  ...extra,
});

const press = (tile: DomNode | undefined): void =>
  tile?.bubble({ type: 'click', target: tile, button: 0, preventDefault: (): void => undefined, stopPropagation: (): void => undefined } as unknown as Event);

const tilesOf = (favorites: PinnedFavorites): DomNode[] => (favorites as unknown as { place(visible: boolean): DomNode }).place(true).children;

test('the first pinned tabs of the active workspace become the tiles, by position', () => {
  const tabs = [
    pinned(3),
    pinned(1),
    pinned(2, 8),
    pinned(4),
    { id: 5, index: 5, active: true, vivExtData: inWorkspace(7) },
    { id: 6, index: 6, vivExtData: inWorkspace(7) },
  ] as chrome.tabs.Tab[];
  assert.deepEqual(PinnedFavorites.tilesOf(tabs, 12).map(({ id }) => id), [1, 3, 4]);
  assert.deepEqual(PinnedFavorites.tilesOf(tabs, 2).map(({ id }) => id), [1, 3]);
});

test('pinned tabs linked to a favorite do not become tiles', () => {
  const linked = JSON.stringify({ workspaceId: 7, vivarcdi: { favoriteId: 'b1', pinnedUrl: 'https://site1.example/' } });
  const tabs = [pinned(1, 7, { vivExtData: linked }), pinned(2), { id: 5, index: 5, active: true, vivExtData: inWorkspace(7) }] as chrome.tabs.Tab[];
  assert.deepEqual(PinnedFavorites.tilesOf(tabs, 12).map(({ id }) => id), [2]);
});

test('draws one tile per pinned tab, hides their slots and marks the source', async (t) => {
  const { favorites, hidden, changes } = setup(t, [pinned(1, 7, { active: true }), pinned(2, 7, { discarded: true }), pinned(3, 8), { id: 4, index: 4, vivExtData: inWorkspace(7) }]);
  await favorites.start();
  assert.equal(favorites.count, 2);
  assert.ok(changes.length > 0);
  const grid = favorites.place(true);
  assert.equal(grid?.getAttribute(TILE_SOURCE_ATTRIBUTE), 'pinned');
  const tiles = tilesOf(favorites);
  assert.deepEqual(tiles.map((tile) => tile.getAttribute(TILE_ATTRIBUTE)), ['1', '2']);
  assert.deepEqual([tiles[0]?.hasAttribute(CURRENT_ATTRIBUTE), tiles[0]?.hasAttribute(DIMMED_ATTRIBUTE)], [true, false]);
  assert.deepEqual([tiles[1]?.hasAttribute(CURRENT_ATTRIBUTE), tiles[1]?.hasAttribute(DIMMED_ATTRIBUTE)], [false, true]);
  assert.deepEqual([1, 2, 3, 4].map((id) => hidden.has(id)), [true, true, false, false]);
  favorites.stop();
});

test('a tile that is not placed hides nothing', async (t) => {
  const { favorites, hidden } = setup(t, [pinned(1, 7, { active: true }), pinned(2)]);
  await favorites.start();
  assert.equal(hidden.has(1), false);
  favorites.place(true);
  assert.equal(hidden.has(1), true);
  assert.equal(favorites.place(false), null);
  assert.equal(hidden.has(1), false);
});

test('a click on a tile activates its tab, and reloads it when unloaded', async (t) => {
  const { favorites, tabs } = setup(t, [pinned(1, 7, { active: true }), pinned(2, 7, { discarded: true })]);
  await favorites.start();
  const [first, second] = tilesOf(favorites);
  press(first);
  await settle();
  press(second);
  await settle();
  assert.deepEqual(tabs.calls.filter(([call]) => call !== 'query'), [['activate', 1], ['activate', 2], ['reload', 2]]);
});

test('follows tab changes and never shows more than the maximum', async (t) => {
  const { favorites, tabs } = setup(t, [pinned(1, 7, { active: true })], 2);
  await favorites.start();
  tabs.open(pinned(2));
  tabs.open(pinned(3));
  await settle();
  await settle();
  assert.equal(favorites.count, 2);
  tabs.close(2);
  await settle();
  await settle();
  assert.equal(favorites.count, 2);
  tabs.close(3);
  await settle();
  await settle();
  assert.equal(favorites.count, 1);
});

test('stop removes the tiles, the hiding and the listeners', async (t) => {
  const { favorites, hidden, tabs } = setup(t, [pinned(1, 7, { active: true })]);
  await favorites.start();
  favorites.place(true);
  favorites.stop();
  assert.equal(hidden.has(1), false);
  assert.equal(tabs.listenerCount(), 0);
});
