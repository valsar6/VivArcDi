import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabs } from '../../../src/core/HiddenTabs.js';
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
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ tabListHost: '.list', browser: '#browser', tabStrip: '.strip', tabWrapper: '.wrapper' }, 'test'),
    logger: silentLogger(),
    options: { root: 'Importati da Firefox/Bookmarks Bar', maxDepth: 3, maxHeightPercent: 60 },
    tabs,
    bookmarks,
    storage: new MemoryStorage(),
  } as unknown as ModuleContext;
  return { dom, module: new BookmarkFolders(), context };
}

const frame = async (): Promise<void> => {
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 5));
};

const rows = (dom: DomDocument): DomNode[] => dom.parent.children[0]?.children[0]?.children ?? [];

function installFrames(t: TestContext): void {
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
}

test('draws the folders above the tab list and removes them on stop', async (t) => {
  installFrames(t);
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

test('hides the tab of a link from the tab list', async (t) => {
  installFrames(t);
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: 'https://id.atlassian.com/login', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11' } }) },
  ]);
  const { dom, module, context } = setup(tabs);
  const hidden = HiddenTabs.of(context.document);
  await module.start(context);
  await frame();
  assert.deepEqual([1, 2].map((id) => hidden.has(id)), [false, true]);

  module.stop();
  assert.deepEqual([1, 2].map((id) => hidden.has(id)), [false, false]);
  assert.deepEqual(dom.parent.children, [dom.list]);
});

test('links the open tab of a link at start and unlinks the tab of a removed bookmark', async (t) => {
  installFrames(t);
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: MAHJONG },
    { id: 3, url: 'https://old.example/', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '99' } }) },
  ]);
  const { module, context } = setup(tabs);
  const hidden = HiddenTabs.of(context.document);
  await module.start(context);
  await frame();
  assert.deepEqual(JSON.parse(tabs.tabs.get(2)?.vivExtData ?? '{}'), { vivarcdi: { bookmarkId: '11' } });
  assert.equal(tabs.tabs.get(3)?.vivExtData, '{}');
  assert.deepEqual([2, 3].map((id) => hidden.has(id)), [true, false]);
  module.stop();
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
