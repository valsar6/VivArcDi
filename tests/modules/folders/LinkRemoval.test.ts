import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import { FavoriteDropZone } from '../../../src/core/FavoriteDropZone.js';
import type { TodayTarget } from '../../../src/core/TodayList.js';
import { TabData } from '../../../src/core/TabData.js';
import { FavoriteDrop } from '../../../src/modules/favorites/FavoriteDrop.js';
import type { GridTarget } from '../../../src/modules/favorites/GridDropZone.js';
import { GridFavoriteTargets } from '../../../src/modules/favorites/GridFavoriteTargets.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { CreatedLinks } from '../../../src/modules/folders/CreatedLinks.js';
import { KEPT_TEXT } from '../../../src/modules/folders/FavoriteShortcut.js';
import { LinkRemoval } from '../../../src/modules/folders/LinkRemoval.js';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { WorkspaceFavorites } from '../../../src/modules/folders/WorkspaceFavorites.js';
import { LinkingTabs, silentLogger } from '../favorites/linked.js';
import { MemoryStorage } from '../reopen/fakes.js';
import { WritableChrome, bookmarkTree, folder, link } from './fakes.js';
import type { FolderTab } from './fakes.js';

const PAGE = 'https://example.com/page';
const OTHER = 'https://other.example/';

class MovingTabs extends LinkingTabs {
  public async move(tabId: number, properties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab> {
    this.calls.push(['move', tabId, properties]);
    return this.update(tabId, { index: properties.index });
  }
}

interface Setup {
  chrome: WritableChrome;
  tabs: MovingTabs;
  notes: string[];
  where: { grid: GridTarget | null; today: TodayTarget | null };
  removal: LinkRemoval;
}

function setup(tabs: FolderTab[], createdByVivArcDi: boolean): Setup {
  const chrome = new WritableChrome(bookmarkTree([folder('30', 'Favorites'), folder('31', 'Casetta', [link('33', 'Mine', PAGE)])]));
  const folderTabs = new MovingTabs(tabs);
  const created = new CreatedLinks(new MemoryStorage());
  if (createdByVivArcDi) {
    created.add('33');
  }
  const tabLinks = new TabLinks(folderTabs);
  const favorites = new WorkspaceFavorites({ writer: chrome.writer, links: tabLinks, created, root: (): string[] => ['Casetta'], logger: silentLogger });
  const where: Setup['where'] = { grid: null, today: null };
  const zone = FavoriteDropZone.of({});
  zone.register(
    new GridFavoriteTargets({
      zone: { at: (): GridTarget | null => where.grid, mark: (): void => undefined, clear: (): void => undefined },
      drop: new FavoriteDrop({ tabs: folderTabs, writer: chrome.writer, links: new LinkedTabs(folderTabs), folder: 'Favorites', logger: silentLogger }),
    }),
  );
  const notes: string[] = [];
  const removal = new LinkRemoval({
    tabs: folderTabs,
    writer: chrome.writer,
    links: tabLinks,
    favorites,
    grid: zone,
    today: { at: (): TodayTarget | null => where.today, mark: (): void => undefined, clear: (): void => undefined, first: (): TodayTarget => ({ rowTabId: 4 }) },
    notify: (text): void => void notes.push(text),
    logger: silentLogger,
  });
  return { chrome, tabs: folderTabs, notes, where, removal };
}

const linkTab = (id: number, extra: Partial<FolderTab> = {}): FolderTab => ({ id, url: PAGE, title: 'Mine', index: id, vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '33' } }), ...extra });

const find = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? [], id) ?? [])).at(0);
const titlesIn = (chrome: WritableChrome, id: string): string[] => find(chrome.tree, id)?.children?.map((child) => child.title) ?? [];

test('turns a link dragged below the separator into a today tab', async () => {
  const { chrome, tabs, notes, where, removal } = setup([linkTab(1), { id: 4, url: OTHER, index: 7 }], true);
  where.today = { rowTabId: 4 };
  await removal.release('33', 5, 5);
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), {});
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'move'), [['move', 1, { index: 7 }]]);
  assert.deepEqual(titlesIn(chrome, '31'), []);
  assert.deepEqual(notes, []);
});

test('opens a tab on the address of a link that has none', async () => {
  const { chrome, tabs, where, removal } = setup([{ id: 4, url: OTHER, index: 7 }], true);
  where.today = { rowTabId: 4 };
  await removal.release('33', 5, 5);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'create'), [['create', { url: PAGE, active: false }]]);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'move'), [['move', 100, { index: 7 }]]);
  assert.deepEqual(titlesIn(chrome, '31'), []);
});

test('turns a link dragged onto the grid into a favorite', async () => {
  const { chrome, tabs, where, removal } = setup([linkTab(1)], true);
  where.grid = { beforeId: null };
  await removal.release('33', 5, 5);
  assert.deepEqual(titlesIn(chrome, '30'), ['Mine']);
  assert.deepEqual(titlesIn(chrome, '31'), []);
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, true);
  assert.deepEqual(TabData.ownOf(tab), { favoriteId: '500', pinnedUrl: PAGE });
});

test('adds a favorite from the address of a link that has no tab', async () => {
  const { chrome, where, removal } = setup([], true);
  where.grid = { beforeId: null };
  await removal.release('33', 5, 5);
  assert.deepEqual(titlesIn(chrome, '30'), ['Mine']);
  assert.deepEqual(titlesIn(chrome, '31'), []);
});

test('keeps a bookmark that existed before when its link is dragged out', async () => {
  const { chrome, tabs, notes, where, removal } = setup([linkTab(1), { id: 4, url: OTHER, index: 7 }], false);
  where.today = { rowTabId: 4 };
  await removal.release('33', 5, 5);
  assert.deepEqual(titlesIn(chrome, '31'), ['Mine']);
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), {});
  assert.deepEqual(notes, [KEPT_TEXT]);
});

test('keeps the link and its tab when the page cannot become a favorite', async () => {
  const { chrome, tabs, notes, where, removal } = setup([linkTab(1)], true);
  where.grid = { beforeId: null };
  chrome.failing.add('create');
  await removal.release('33', 5, 5);
  assert.deepEqual(titlesIn(chrome, '31'), ['Mine']);
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), { bookmarkId: '33' });
  assert.deepEqual(notes, []);
});

test('uses the tab of the link in the active workspace', async () => {
  const other = linkTab(2, { vivExtData: JSON.stringify({ workspaceId: 2, vivarcdi: { bookmarkId: '33' } }) });
  const { tabs, where, removal } = setup([linkTab(1, { active: true, vivExtData: JSON.stringify({ workspaceId: 1, vivarcdi: { bookmarkId: '33' } }) }), other], true);
  where.today = { rowTabId: null };
  await removal.release('33', 5, 5);
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), {});
  assert.deepEqual(TabData.ownOf(await tabs.get(2)), { bookmarkId: '33' });
});

test('removes the pin of a link from the menu', async () => {
  const { chrome, tabs, notes, removal } = setup([linkTab(1), { id: 4, url: OTHER, index: 7 }], true);
  await removal.removePin('33');
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), {});
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'move'), [['move', 1, { index: 7 }]]);
  assert.deepEqual(titlesIn(chrome, '31'), []);
  assert.deepEqual(notes, []);
});

test('moves a page between the grid and the workspace favorites from the menu', async () => {
  const { chrome, tabs, removal } = setup([linkTab(1)], true);
  await removal.tile('33');
  assert.deepEqual(titlesIn(chrome, '30'), ['Mine']);
  assert.deepEqual(titlesIn(chrome, '31'), []);
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, true);
  assert.deepEqual(TabData.ownOf(tab), { favoriteId: '500', pinnedUrl: PAGE });
});

test('keeps a bookmark that existed before on remove pin', async () => {
  const { chrome, tabs, notes, removal } = setup([linkTab(1), { id: 4, url: OTHER, index: 7 }], false);
  await removal.removePin('33');
  assert.deepEqual(titlesIn(chrome, '31'), ['Mine']);
  assert.deepEqual(TabData.ownOf(await tabs.get(1)), {});
  assert.deepEqual(notes, [KEPT_TEXT]);
});
