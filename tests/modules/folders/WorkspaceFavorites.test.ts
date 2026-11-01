import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabData } from '../../../src/core/TabData.js';
import { CreatedLinks } from '../../../src/modules/folders/CreatedLinks.js';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { WorkspaceFavorites } from '../../../src/modules/folders/WorkspaceFavorites.js';
import { Logger } from '../../../src/core/Logger.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from './fakes.js';

const PAGE = 'https://example.com/page';
const ROOT = ['VivArcDi', 'Casetta'];

function recordingLogger(): { logger: Logger; warnings: unknown[][] } {
  const warnings: unknown[][] = [];
  const sink = { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) };
  return { logger: new Logger('test', sink), warnings };
}

function setup(tree = bookmarkTree([]), tabs = new FolderTabs([{ id: 1, active: true, url: PAGE, title: 'A page' }]), logger: Logger = silentLogger()): { chrome: WritableChrome; tabs: FolderTabs; created: CreatedLinks; favorites: WorkspaceFavorites } {
  const chrome = new WritableChrome(tree);
  const created = new CreatedLinks(new MemoryStorage());
  const favorites = new WorkspaceFavorites({ writer: chrome.writer, links: new TabLinks(tabs), created, root: (): string[] => ROOT, logger });
  return { chrome, tabs, created, favorites };
}

const childrenOf = (chrome: WritableChrome, title: string): Array<string | undefined> => {
  const find = (nodes: typeof chrome.tree): (typeof chrome.tree)[number] | undefined => nodes.flatMap((node) => (node.title === title && node.children !== undefined ? [node] : find(node.children ?? []) ?? [])).at(0);
  return find(chrome.tree)?.children?.map((child) => child.title) ?? [];
};

const ownOf = async (tabs: FolderTabs, id: number): Promise<ReturnType<typeof TabData.ownOf>> => TabData.ownOf(await tabs.get(id));

test('creates an Untitled folder at the end of the root', async () => {
  const { chrome, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [folder('32', 'Hobbies')])])]));
  const id = await favorites.addFolder();
  assert.notEqual(id, null);
  assert.deepEqual(childrenOf(chrome, 'Casetta'), ['Hobbies', 'Untitled']);
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('create')), ['create Untitled']);
});

test('creates the base and workspace folders for the first folder', async () => {
  const { chrome, favorites } = setup();
  assert.notEqual(await favorites.addFolder(), null);
  assert.deepEqual(chrome.created, ['VivArcDi', 'Casetta', 'Untitled']);
});

test('adds a tab as a link at the end of the root and links the tab', async () => {
  const { chrome, tabs, created, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [folder('32', 'Hobbies')])])]));
  assert.equal(await favorites.add(await tabs.get(1)), 'added');
  assert.deepEqual(childrenOf(chrome, 'Casetta'), ['Hobbies', 'A page']);
  const bookmarkId = (await ownOf(tabs, 1)).bookmarkId;
  assert.notEqual(bookmarkId, undefined);
  assert.equal(created.has(bookmarkId ?? ''), true);
});

test('adds a tab at an index or into a folder', async () => {
  const tree = bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [folder('32', 'Hobbies'), link('33', 'Chess', 'https://chess.com/')])])]);
  const { chrome, tabs, favorites } = setup(tree);
  await favorites.add(await tabs.get(1), { index: 1 });
  assert.deepEqual(childrenOf(chrome, 'Casetta'), ['Hobbies', 'A page', 'Chess']);
  tabs.open({ id: 2, url: 'https://two.example/', title: 'Two' });
  await favorites.add(await tabs.get(2), { parentId: '32' });
  assert.deepEqual(childrenOf(chrome, 'Hobbies'), ['Two']);
});

test('ignores a tab that cannot become a link', async () => {
  const tabs = new FolderTabs([
    { id: 1, url: 'vivaldi://settings' },
    { id: 2, url: PAGE, pinned: true },
    { id: 3, url: PAGE, vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '33' } }) },
    { id: 4, url: PAGE, vivExtData: JSON.stringify({ vivarcdi: { favoriteId: '9' } }) },
    { id: 5 },
  ]);
  const { chrome, favorites } = setup(bookmarkTree([]), tabs);
  for (const id of [1, 2, 3, 4, 5]) {
    assert.equal(await favorites.add(await tabs.get(id)), 'ignored', `tab ${id}`);
  }
  assert.deepEqual(chrome.calls, []);
});

test('keeps the section when a bookmark write fails', async () => {
  const { logger, warnings } = recordingLogger();
  const { chrome, tabs, created, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta')])]), undefined, logger);
  chrome.failing.add('create');
  assert.equal(await favorites.add(await tabs.get(1)), 'failed');
  assert.equal(await favorites.addFolder(), null);
  assert.deepEqual(childrenOf(chrome, 'Casetta'), []);
  assert.equal((await ownOf(tabs, 1)).bookmarkId, undefined);
  assert.equal(warnings.length, 2);
  assert.equal(created.has('500'), false);
});

test('removes the bookmark again when the tab cannot be linked', async () => {
  const { chrome, tabs, created, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta')])]));
  tabs.failing.add('update');
  assert.equal(await favorites.add(await tabs.get(1)), 'failed');
  assert.deepEqual(childrenOf(chrome, 'Casetta'), []);
  assert.equal(created.has('500'), false);
});

test('takes a tab back and removes the bookmark it created', async () => {
  const { chrome, tabs, created, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta')])]));
  await favorites.add(await tabs.get(1));
  assert.equal(await favorites.take(await tabs.get(1)), 'taken');
  await settle();
  assert.deepEqual(childrenOf(chrome, 'Casetta'), []);
  assert.equal((await ownOf(tabs, 1)).bookmarkId, undefined);
  assert.equal(created.has('500'), false);
});

test('keeps a bookmark that VivArcDi did not create', async () => {
  const link33 = JSON.stringify({ vivarcdi: { bookmarkId: '33' } });
  const tabs = new FolderTabs([{ id: 1, url: PAGE, vivExtData: link33 }, { id: 2, url: PAGE }]);
  const { chrome, favorites } = setup(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [link('33', 'Mine', PAGE)])])]), tabs);
  assert.equal(await favorites.take(await tabs.get(1)), 'kept');
  assert.equal(await favorites.take(await tabs.get(2)), 'none');
  assert.deepEqual(childrenOf(chrome, 'Casetta'), ['Mine']);
  assert.equal((await ownOf(tabs, 1)).bookmarkId, '33');
});

test('writes nothing when the workspace has no root', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  const tabs = new FolderTabs([{ id: 1, url: PAGE }]);
  const favorites = new WorkspaceFavorites({ writer: chrome.writer, links: new TabLinks(tabs), created: new CreatedLinks(new MemoryStorage()), root: (): string[] => [], logger: silentLogger() });
  assert.equal(await favorites.add(await tabs.get(1)), 'ignored');
  assert.equal(await favorites.addFolder(), null);
  assert.deepEqual(chrome.calls, []);
});
