import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { BookmarkFolders } from '../../../src/modules/folders/BookmarkFolders.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { FolderTabs, bookmarkTree, folder, link, recordingChrome } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const TREE = bookmarkTree([folder('10', 'Hobbies', [link('11', 'Mahjong Soul', MAHJONG)]), folder('20', 'Music')]);

function setup(tabs: FolderTabs, bookmarks: BrowserBookmarks = recordingChrome(TREE).bookmarks): { dom: DomDocument; module: BookmarkFolders; context: ModuleContext } {
  const dom = new DomDocument();
  dom.defaultView = { localStorage: new MemoryStorage() };
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ tabListHost: '.list' }, 'test'),
    logger: silentLogger(),
    options: { root: 'Importati da Firefox/Bookmarks Bar', maxDepth: 3, maxHeightPercent: 60 },
    tabs,
    bookmarks,
  } as unknown as ModuleContext;
  return { dom, module: new BookmarkFolders(), context };
}

const frame = async (): Promise<void> => {
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 5));
};

const rows = (dom: DomDocument): DomNode[] => dom.parent.children[0]?.children[0]?.children ?? [];

test('draws the folders above the tab list and removes them on stop', async (t) => {
  const frames = globalThis as unknown as Record<string, unknown>;
  frames['requestAnimationFrame'] = (run: () => void): NodeJS.Timeout => setTimeout(run, 0);
  frames['cancelAnimationFrame'] = (handle: NodeJS.Timeout): void => clearTimeout(handle);
  frames['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => {
    delete frames['requestAnimationFrame'];
    delete frames['cancelAnimationFrame'];
    delete frames['MutationObserver'];
  });
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/' }]);
  const { dom, module, context } = setup(tabs);
  await module.start(context);
  await frame();
  assert.deepEqual(
    rows(dom).map((row) => row.textContent === '' ? row.children[1]?.textContent : row.textContent),
    ['Hobbies', 'Music'],
  );

  rows(dom)[0]?.click();
  await frame();
  assert.equal(rows(dom).length, 3);

  rows(dom)[1]?.click();
  await settle();
  assert.deepEqual(tabs.actions()[0]?.[0], 'create');

  module.stop();
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.equal(tabs.listenerCount(), 0);
});

test('bookmark folders stay off without chrome.bookmarks', async () => {
  const tabs = new FolderTabs();
  const { dom, module, context } = setup(tabs, new BrowserBookmarks(undefined));
  await module.start(context);
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.equal(tabs.listenerCount(), 0);
});

test('bookmark folders stay off when the tab list is missing', async () => {
  const tabs = new FolderTabs();
  const { dom, module, context } = setup(tabs);
  dom.list.remove();
  await module.start(context);
  assert.equal(tabs.listenerCount(), 0);
});
