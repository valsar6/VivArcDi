import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import { TabData } from '../../../src/core/TabData.js';
import { CreatedLinks } from '../../../src/modules/folders/CreatedLinks.js';
import { TabDrops } from '../../../src/modules/folders/TabDrops.js';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { WorkspaceFavorites } from '../../../src/modules/folders/WorkspaceFavorites.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from './fakes.js';
import type { FolderTab } from './fakes.js';

const PAGE = 'https://example.com/page';
const TREE = bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [folder('32', 'Hobbies', [link('34', 'Chess', 'https://chess.com/')]), link('33', 'Mine', 'https://mine.example/')])])]);

function setup(tabs: FolderTab[]): { chrome: WritableChrome; tabs: FolderTabs; drops: TabDrops } {
  const chrome = new WritableChrome(TREE);
  const folderTabs = new FolderTabs(tabs);
  const favorites = new WorkspaceFavorites({
    writer: chrome.writer,
    links: new TabLinks(folderTabs),
    created: new CreatedLinks(new MemoryStorage()),
    root: (): string[] => ['VivArcDi', 'Casetta'],
    logger: silentLogger(),
  });
  const ids = ['32', '33'];
  const drops = new TabDrops({ tabs: folderTabs, favorites, indexBefore: (id): number | undefined => (id === null ? undefined : ids.indexOf(id)), logger: silentLogger() });
  return { chrome, tabs: folderTabs, drops };
}

const find = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? [], id) ?? [])).at(0);
const titlesIn = (chrome: WritableChrome, id: string): string[] => find(chrome.tree, id)?.children?.map((child) => child.title) ?? [];
const bookmarkOf = async (tabs: FolderTabs, id: number): Promise<string | undefined> => TabData.ownOf(await tabs.get(id)).bookmarkId;

test('bookmarks a dropped tab into the folder and links it', async () => {
  const { chrome, tabs, drops } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  await drops.drop(1, { kind: 'folder', id: '32' });
  assert.deepEqual(titlesIn(chrome, '32'), ['Chess', 'A page']);
  assert.equal(await bookmarkOf(tabs, 1), '500');
  assert.equal(find(chrome.tree, '500')?.url, PAGE);
});

test('bookmarks a tab dropped on the header at the top level', async () => {
  const { chrome, tabs, drops } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  await drops.drop(1, { kind: 'header' });
  assert.deepEqual(titlesIn(chrome, '31'), ['Hobbies', 'Mine', 'A page']);
  assert.equal(await bookmarkOf(tabs, 1), '500');
});

test('ignores drops of tabs that cannot become links', async () => {
  const { chrome, drops } = setup([
    { id: 1, url: 'vivaldi://settings' },
    { id: 2, url: PAGE, pinned: true },
    { id: 3, url: PAGE, vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '33' } }) },
    { id: 4, url: PAGE, vivExtData: JSON.stringify({ vivarcdi: { favoriteId: '9' } }) },
  ]);
  for (const id of [1, 2, 3, 4]) {
    await drops.drop(id, { kind: 'folder', id: '32' });
    await drops.drop(id, { kind: 'header' });
  }
  assert.deepEqual(chrome.calls, []);
});

test('puts a tab dropped between two rows at that position and ignores a drop on nothing', async () => {
  const { chrome, drops } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  await drops.drop(1, null);
  assert.deepEqual(chrome.calls, []);
  await drops.drop(1, { kind: 'between', before: '33', rowId: '32', edge: 'after' });
  assert.deepEqual(titlesIn(chrome, '31'), ['Hobbies', 'A page', 'Mine']);
});

test('does nothing for a tab that no longer exists', async () => {
  const { chrome, drops } = setup([]);
  await drops.drop(99, { kind: 'header' });
  assert.deepEqual(chrome.calls, []);
});
