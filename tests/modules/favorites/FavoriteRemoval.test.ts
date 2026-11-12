import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import { LinkDropZone } from '../../../src/shared/dragdrop/LinkDropZone.js';
import { TabData } from '../../../src/core/tabs/TabData.js';
import { FavoriteRemoval } from '../../../src/modules/favorites/FavoriteRemoval.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import type { TodayTarget } from '../../../src/shared/tabs/TodayList.js';
import { CreatedLinks } from '../../../src/modules/folders/favoritelinks/CreatedLinks.js';
import { DropPlace } from '../../../src/modules/folders/dragdrop/DropPlace.js';
import type { DropTarget } from '../../../src/modules/folders/dragdrop/DropTargets.js';
import { FolderLinkTargets } from '../../../src/modules/folders/dragdrop/FolderLinkTargets.js';
import { TabLinks } from '../../../src/modules/folders/links/TabLinks.js';
import { WorkspaceFavorites } from '../../../src/modules/folders/favoritelinks/WorkspaceFavorites.js';
import { MemoryStorage } from '../reopen/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { silentLogger } from './linked.js';

const PAGE = 'https://example.com/page';
const OTHER = 'https://other.example/';

class MovingTabs extends FolderTabs {
  public async move(tabId: number, properties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab> {
    this.calls.push(['move', tabId, properties]);
    const tab = this.tabs.get(tabId);
    if (tab !== undefined) {
      this.tabs.set(tabId, { ...tab, index: properties.index });
    }
    return { ...this.tabs.get(tabId) } as chrome.tabs.Tab;
  }
}

const favoriteTab = (id: number, workspaceId: number, extra: Partial<FolderTab> = {}): FolderTab => ({
  id,
  url: PAGE,
  pinned: true,
  active: workspaceId === 1,
  index: id,
  vivExtData: JSON.stringify({ workspaceId, vivarcdi: { favoriteId: 'f1', pinnedUrl: PAGE } }),
  ...extra,
});

interface Setup {
  chrome: WritableChrome;
  tabs: MovingTabs;
  removal: FavoriteRemoval;
  where: { link: DropTarget | null; today: TodayTarget | null };
  marks: string[];
}

function setup(tabs: FolderTab[]): Setup {
  const chrome = new WritableChrome(bookmarkTree([folder('30', 'Favorites', [link('f1', 'Example', PAGE)]), folder('31', 'Casetta', [folder('32', 'Hobbies')])]));
  const folderTabs = new MovingTabs(tabs);
  const where: Setup['where'] = { link: null, today: null };
  const marks: string[] = [];
  const favorites = new WorkspaceFavorites({ writer: chrome.writer, links: new TabLinks(folderTabs), created: new CreatedLinks(new MemoryStorage()), root: (): string[] => ['Casetta'], logger: silentLogger });
  const zone = LinkDropZone.of({});
  zone.register(
    new FolderLinkTargets({
      targets: { at: (): DropTarget | null => where.link, mark: (target): void => void marks.push(target === null ? 'unmark' : 'mark'), clear: (): void => void marks.push('clear') },
      place: new DropPlace((): undefined => undefined),
      favorites,
      logger: silentLogger,
    }),
  );
  const removal = new FavoriteRemoval({
    tabs: folderTabs,
    writer: chrome.writer,
    links: new LinkedTabs(folderTabs),
    zone,
    today: { at: (): TodayTarget | null => where.today, mark: (): void => void marks.push('today'), clear: (): void => void marks.push('clear-today'), first: (): TodayTarget => ({ rowTabId: 4 }) },
    logger: silentLogger,
  });
  return { chrome, tabs: folderTabs, removal, where, marks };
}

const find = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? [], id) ?? [])).at(0);
const childTitles = (chrome: WritableChrome, id: string): string[] => find(chrome.tree, id)?.children?.map((child) => child.title) ?? [];
const urlsIn = (chrome: WritableChrome, id: string): Array<string | undefined> => find(chrome.tree, id)?.children?.map((child) => child.url) ?? [];

test('moves a dropped tile into a folder', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1)]);
  where.link = { kind: 'folder', id: '32' };
  await removal.release('f1', 5, 5);
  assert.deepEqual(childTitles(chrome, '30'), []);
  assert.deepEqual(urlsIn(chrome, '32'), [PAGE]);
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, false);
  assert.deepEqual(TabData.ownOf(tab), { bookmarkId: '500' });
});

test('never loses the page of a dragged tile', async () => {
  const scenarios: Array<{ name: string; tabs: FolderTab[]; link: DropTarget | null; today: TodayTarget | null; fails?: string }> = [
    { name: 'folder with a tab', tabs: [favoriteTab(1, 1)], link: { kind: 'folder', id: '32' }, today: null },
    { name: 'folder without a tab', tabs: [], link: { kind: 'folder', id: '32' }, today: null },
    { name: 'header', tabs: [favoriteTab(1, 1)], link: { kind: 'header' }, today: null },
    { name: 'today with a tab', tabs: [favoriteTab(1, 1)], link: null, today: { rowTabId: null } },
    { name: 'today without a tab', tabs: [], link: null, today: { rowTabId: null } },
  ];
  for (const scenario of scenarios) {
    const { chrome, tabs, removal, where } = setup(scenario.tabs);
    where.link = scenario.link;
    where.today = scenario.today;
    await removal.release('f1', 5, 5);
    const inFavorites = urlsIn(chrome, '30').includes(PAGE);
    const inFolders = urlsIn(chrome, '31').includes(PAGE) || urlsIn(chrome, '32').includes(PAGE);
    const asTab = [...tabs.tabs.values()].some((tab) => tab.url === PAGE && tab.pinned !== true && TabData.ownOf(tab as chrome.tabs.Tab).favoriteId === undefined);
    assert.equal(inFavorites, false, scenario.name);
    assert.equal(inFolders || asTab, true, scenario.name);
  }
});

test('keeps the favorite and the page when the link cannot be written', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1), favoriteTab(2, 2)]);
  where.link = { kind: 'folder', id: '32' };
  chrome.failing.add('create');
  await removal.release('f1', 5, 5);
  assert.deepEqual(urlsIn(chrome, '30'), [PAGE]);
  assert.equal(tabs.tabs.has(1), true);
  assert.equal(tabs.tabs.has(2), true);
});

test('links the page from its title and address when the favorite has no tab', async () => {
  const { chrome, removal, where } = setup([]);
  where.link = { kind: 'folder', id: '32' };
  await removal.release('f1', 5, 5);
  assert.deepEqual(childTitles(chrome, '32'), ['Example']);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('closes the tabs of the favorite in other workspaces and leaves other tabs', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1), favoriteTab(2, 2), { id: 3, url: OTHER, vivExtData: JSON.stringify({ workspaceId: 2 }) }]);
  where.link = { kind: 'header' };
  await removal.release('f1', 5, 5);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), [['remove', 2]]);
  assert.equal(tabs.tabs.has(3), true);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('turns the tab into a Today tab at the row under the pointer', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1), { id: 4, url: OTHER, index: 7 }]);
  where.today = { rowTabId: 4 };
  await removal.release('f1', 5, 5);
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, false);
  assert.deepEqual(TabData.ownOf(tab), {});
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'move'), [['move', 1, { index: 7 }]]);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('leaves the tab where Vivaldi shows it when the move is refused', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1), { id: 4, url: OTHER, index: 7 }]);
  where.today = { rowTabId: 4 };
  tabs.move = async (): Promise<chrome.tabs.Tab> => {
    throw new Error('refused');
  };
  await removal.release('f1', 5, 5);
  assert.equal((await tabs.get(1)).pinned, false);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('opens a tab on the address when the favorite has none', async () => {
  const { chrome, tabs, removal, where } = setup([]);
  where.today = { rowTabId: null };
  await removal.release('f1', 5, 5);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'create'), [['create', { url: PAGE, active: false }]]);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('does nothing when the tile is released over neither the folders nor the tab list', async () => {
  const { chrome, tabs, removal } = setup([favoriteTab(1, 1)]);
  await removal.release('f1', 5, 5);
  assert.deepEqual(childTitles(chrome, '30'), ['Example']);
  assert.equal((await tabs.get(1)).pinned, true);
});

test('keeps the favorite when the bookmark cannot be read', async () => {
  const { chrome, tabs, removal, where } = setup([favoriteTab(1, 1)]);
  where.today = { rowTabId: null };
  chrome.failing.add('get');
  await removal.release('f1', 5, 5);
  assert.deepEqual(childTitles(chrome, '30'), ['Example']);
  assert.equal((await tabs.get(1)).pinned, true);
});

test('marks the place under the pointer and clears the marks', () => {
  const { removal, where, marks } = setup([]);
  where.link = { kind: 'header' };
  removal.over(1, 1);
  where.link = null;
  where.today = { rowTabId: null };
  removal.over(1, 1);
  removal.clear();
  assert.deepEqual(marks, ['mark', 'clear-today', 'unmark', 'today', 'clear', 'clear-today']);
});

test('untiles a favorite from the menu', async () => {
  const { chrome, tabs, removal } = setup([favoriteTab(1, 1), favoriteTab(2, 2), { id: 4, url: OTHER, index: 7 }]);
  await removal.untile('f1');
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, false);
  assert.deepEqual(TabData.ownOf(tab), {});
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'move'), [['move', 1, { index: 7 }]]);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), [['remove', 2]]);
  assert.deepEqual(childTitles(chrome, '30'), []);
});

test('moves a page between the grid and the workspace favorites from the menu', async () => {
  const { chrome, tabs, removal } = setup([favoriteTab(1, 1)]);
  await removal.pin('f1');
  assert.deepEqual(childTitles(chrome, '30'), []);
  assert.deepEqual(urlsIn(chrome, '31'), [undefined, PAGE]);
  const tab = await tabs.get(1);
  assert.equal(tab.pinned, false);
  assert.deepEqual(TabData.ownOf(tab), { bookmarkId: '500' });
});
