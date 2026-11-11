import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import { TabData } from '../../../src/core/TabData.js';
import { FavoriteDrop } from '../../../src/modules/favorites/FavoriteDrop.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { WritableChrome, bookmarkTree, folder, link } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { LinkingTabs, silentLogger } from './linked.js';

const PAGE = 'https://example.com/page';
const FOLDER = 'Favorites';

const standard = (): ReturnType<typeof bookmarkTree> => bookmarkTree([folder('30', FOLDER, [link('31', 'First', 'https://first.example/'), link('32', 'Second', 'https://second.example/')])]);

function setup(tabs: FolderTab[], tree = standard()): { chrome: WritableChrome; tabs: LinkingTabs; drop: FavoriteDrop } {
  const chrome = new WritableChrome(tree);
  const linking = new LinkingTabs(tabs);
  const drop = new FavoriteDrop({ tabs: linking, writer: chrome.writer, links: new LinkedTabs(linking), folder: FOLDER, logger: silentLogger });
  return { chrome, tabs: linking, drop };
}

const find = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined => nodes.flatMap((node) => (node.id === id ? [node] : find(node.children ?? [], id) ?? [])).at(0);
const titlesIn = (chrome: WritableChrome, id: string): string[] => find(chrome.tree, id)?.children?.map((child) => child.title) ?? [];

test('creates a favorite from a tab', async () => {
  const { chrome, tabs, drop } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  assert.equal(await drop.add(1, '32'), 'added');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'A page', 'Second']);
  const created = find(chrome.tree, '500');
  assert.equal(created?.title, 'A page');
  assert.equal(created?.url, PAGE);
  const tab = await tabs.get(1);
  assert.deepEqual(TabData.ownOf(tab), { favoriteId: '500', pinnedUrl: PAGE });
  assert.equal(tab.pinned, true);
});

test('ignores a page that is already a favorite', async () => {
  const { chrome, tabs, drop } = setup([{ id: 1, url: 'https://first.example/', title: 'First' }]);
  assert.equal(await drop.add(1, null), 'ignored');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'Second']);
  assert.deepEqual(chrome.created, []);
  assert.deepEqual(tabs.calls, []);
});

test('adds at the end of the folder when no tile is under the pointer', async () => {
  const { chrome, drop } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  assert.equal(await drop.add(1, null), 'added');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'Second', 'A page']);
});

test('uses the address as the title of a tab without one', async () => {
  const { chrome, drop } = setup([{ id: 1, url: PAGE, title: '' }]);
  await drop.add(1, null);
  assert.equal(find(chrome.tree, '500')?.title, PAGE);
});

test('creates the favorites folder when it is missing', async () => {
  const { chrome, drop } = setup([{ id: 1, url: PAGE, title: 'A page' }], bookmarkTree([]));
  assert.equal(await drop.add(1, null), 'added');
  assert.deepEqual(chrome.created, [FOLDER, 'A page']);
});

test('ignores pages that are not web pages and tabs already linked to a favorite', async () => {
  const { chrome, drop } = setup([
    { id: 1, url: 'vivaldi://settings' },
    { id: 2, url: PAGE, vivExtData: JSON.stringify({ vivarcdi: { favoriteId: '31' } }) },
  ]);
  assert.equal(await drop.add(1, null), 'ignored');
  assert.equal(await drop.add(2, null), 'ignored');
  assert.deepEqual(chrome.created, []);
});

test('removes the new bookmark when the tab cannot be pinned', async () => {
  const { chrome, tabs, drop } = setup([{ id: 1, url: PAGE, title: 'A page' }]);
  tabs.failing.add('update');
  assert.equal(await drop.add(1, null), 'failed');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'Second']);
});

test('adds a page that no tab stands for as a favorite before a tile', async () => {
  const { chrome, tabs, drop } = setup([]);
  assert.equal(await drop.addPage({ title: 'A page', url: PAGE }, '32'), 'added');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'A page', 'Second']);
  assert.equal(find(chrome.tree, '500')?.url, PAGE);
  assert.deepEqual(tabs.calls, []);
});

test('ignores a page that is not a web page or already a favorite when adding by address', async () => {
  const { chrome, drop } = setup([]);
  assert.equal(await drop.addPage({ title: 'Settings', url: 'vivaldi://settings' }, null), 'ignored');
  assert.equal(await drop.addPage({ title: 'First', url: 'https://first.example/' }, null), 'ignored');
  assert.deepEqual(titlesIn(chrome, '30'), ['First', 'Second']);
});
