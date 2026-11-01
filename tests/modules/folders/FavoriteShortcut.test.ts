import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/bookmarks/BookmarkNode.js';
import { TabData } from '../../../src/core/TabData.js';
import { CreatedLinks } from '../../../src/modules/folders/CreatedLinks.js';
import { FavoriteShortcut, KEPT_TEXT, NOT_A_PAGE_TEXT } from '../../../src/modules/folders/FavoriteShortcut.js';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { WorkspaceFavorites } from '../../../src/modules/folders/WorkspaceFavorites.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link } from './fakes.js';
import type { FolderTab } from './fakes.js';

const PAGE = 'https://example.com/page';
const ROOT_TREE = (children = [folder('32', 'Hobbies')]): ReturnType<typeof bookmarkTree> => bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', children)])]);

interface Press {
  prevented: boolean;
  stopped: boolean;
}

const KEY = { key: 'd', metaKey: true, defaultPrevented: false };

function setup(tab: FolderTab, tree = ROOT_TREE()): { dom: DomDocument; tabs: FolderTabs; chrome: WritableChrome; messages: string[]; press: (init?: Record<string, unknown>) => Promise<Press> } {
  const dom = new DomDocument();
  const tabs = new FolderTabs([{ active: true, ...tab }]);
  const chrome = new WritableChrome(tree);
  const messages: string[] = [];
  const favorites = new WorkspaceFavorites({
    writer: chrome.writer,
    links: new TabLinks(tabs),
    created: new CreatedLinks(new MemoryStorage()),
    root: (): string[] => ['VivArcDi', 'Casetta'],
    logger: silentLogger(),
  });
  new FavoriteShortcut({
    document: asDocument(dom),
    activeTab: async (): Promise<chrome.tabs.Tab | undefined> => (await tabs.query({ active: true }))[0],
    favorites,
    notify: (text): void => void messages.push(text),
    logger: silentLogger(),
  }).attach();
  const press = async (init: Record<string, unknown> = {}): Promise<Press> => {
    const state: Press = { prevented: false, stopped: false };
    dom.emit('keydown', {
      ...KEY,
      preventDefault: (): void => void (state.prevented = true),
      stopImmediatePropagation: (): void => void (state.stopped = true),
      ...init,
    });
    await settle();
    await settle();
    return state;
  };
  return { dom, tabs, chrome, messages, press };
}

const casetta = (nodes: BookmarkNode[]): BookmarkNode | undefined => nodes.flatMap((node) => (node.title === 'Casetta' ? [node] : casetta(node.children ?? []) ?? [])).at(0);
const titlesOf = (chrome: WritableChrome): string[] => casetta(chrome.tree)?.children?.map((child) => child.title) ?? [];

test('adds the active tab to the workspace favorites on the shortcut', async () => {
  const { tabs, chrome, press } = setup({ id: 1, url: PAGE, title: 'A page' });
  const state = await press();
  assert.deepEqual(state, { prevented: true, stopped: true });
  assert.deepEqual(titlesOf(chrome), ['Hobbies', 'A page']);
  assert.equal(TabData.ownOf(await tabs.get(1)).bookmarkId, '500');
});

test('takes the tab back on a second press', async () => {
  const { tabs, chrome, press } = setup({ id: 1, url: PAGE, title: 'A page' });
  await press();
  await press({ ctrlKey: true, metaKey: false });
  assert.deepEqual(titlesOf(chrome), ['Hobbies']);
  assert.equal(TabData.ownOf(await tabs.get(1)).bookmarkId, undefined);
});

test('keeps an existing bookmark on a second press', async () => {
  const linked = JSON.stringify({ vivarcdi: { bookmarkId: '33' } });
  const { tabs, chrome, messages, press } = setup({ id: 1, url: PAGE, title: 'Mine', vivExtData: linked }, ROOT_TREE([link('33', 'Mine', PAGE)]));
  await press();
  assert.deepEqual(titlesOf(chrome), ['Mine']);
  assert.equal(TabData.ownOf(await tabs.get(1)).bookmarkId, '33');
  assert.deepEqual(messages, [KEPT_TEXT]);
});

test('tells that only web pages can go to the favorites', async () => {
  const { chrome, messages, press } = setup({ id: 1, url: 'vivaldi://settings' });
  await press();
  assert.deepEqual(messages, [NOT_A_PAGE_TEXT]);
  assert.deepEqual(chrome.calls, []);
});

test('leaves pinned tabs alone and ignores other keys', async () => {
  const { chrome, messages, press } = setup({ id: 1, url: PAGE, pinned: true });
  await press();
  for (const init of [{ shiftKey: true }, { altKey: true }, { metaKey: false }, { key: 'w' }, { defaultPrevented: true }]) {
    const state = await press(init);
    assert.deepEqual(state, { prevented: false, stopped: false }, JSON.stringify(init));
  }
  assert.deepEqual(chrome.calls, []);
  assert.deepEqual(messages, []);
});

test('stops listening after detach', () => {
  const dom = new DomDocument();
  const shortcut = new FavoriteShortcut({
    document: asDocument(dom),
    activeTab: async (): Promise<undefined> => undefined,
    favorites: { add: async (): Promise<'ignored'> => 'ignored', take: async (): Promise<'none'> => 'none' },
    notify: (): void => undefined,
    logger: silentLogger(),
  });
  shortcut.attach();
  shortcut.detach();
  assert.deepEqual(dom.listeners.get('keydown'), []);
});
