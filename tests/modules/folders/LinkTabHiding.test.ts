import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabs } from '../../../src/core/HiddenTabs.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { TabData } from '../../../src/core/TabData.js';
import { BookmarkFolders } from '../../../src/modules/folders/BookmarkFolders.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { ActivityStamps } from '../../../src/modules/today/ActivityStamps.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { bookmarkTree, FakeBookmarks, folder, link } from './fakes.js';
import { RacingFolderTabs } from './racing.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const TREE = bookmarkTree([folder('10', 'Hobbies', [link('11', 'Mahjong Soul', MAHJONG)])]);
const SETTLE_MS = 60;

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

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

interface Running {
  dom: DomDocument;
  module: BookmarkFolders;
  hidden: HiddenTabs;
  stamps: ActivityStamps;
  start: () => Promise<void>;
}

function running(tabs: RacingFolderTabs): Running {
  const dom = new DomDocument();
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ tabListHost: '.list', browser: '#browser', tabStrip: '.strip', tabWrapper: '.wrapper' }, 'test'),
    logger: silentLogger(),
    options: { root: 'Importati da Firefox/Bookmarks Bar', maxDepth: 3, maxHeightPercent: 60 },
    tabs,
    bookmarks: new FakeBookmarks(TREE),
    storage: new MemoryStorage(),
  } as unknown as ModuleContext;
  const module = new BookmarkFolders();
  const stamps = new ActivityStamps(tabs, () => 42, silentLogger());
  return {
    dom,
    module,
    hidden: HiddenTabs.of(context.document),
    stamps,
    start: async (): Promise<void> => {
      await module.start(context);
      await stamps.start();
      await settled();
    },
  };
}

const rows = (dom: DomDocument): DomNode[] => dom.parent.children[0]?.children[0]?.children ?? [];

const ownOf = (tabs: RacingFolderTabs, tabId: number): unknown => TabData.ownOf(tabs.tabs.get(tabId) as chrome.tabs.Tab);

test('hides the tab opened from a link while Today stamps the same tab', async (t) => {
  installFrames(t);
  const tabs = new RacingFolderTabs([{ id: 1, active: true, url: 'https://example.com/' }]);
  const { dom, module, hidden, stamps, start } = running(tabs);
  await start();
  rows(dom)[0]?.click();
  await settled();
  rows(dom)[1]?.click();
  await settled();
  const opened = [...tabs.tabs.keys()].find((id) => id !== 1) as number;
  assert.deepEqual(ownOf(tabs, opened), { bookmarkId: '11', lastActive: 42 });
  assert.equal(hidden.has(opened), true);
  module.stop();
  stamps.stop();
});

test('keeps the bookmark id of a tab that a link adopts while Today stamps it', async (t) => {
  installFrames(t);
  const tabs = new RacingFolderTabs([{ id: 1, active: true, url: 'https://example.com/' }]);
  const { module, hidden, stamps, start } = running(tabs);
  await start();
  tabs.open({ id: 7, url: '' });
  tabs.navigate(7, MAHJONG);
  await settled();
  assert.deepEqual(ownOf(tabs, 7), { bookmarkId: '11', lastActive: 42 });
  assert.equal(hidden.has(7), true);
  module.stop();
  stamps.stop();
});

test('keeps the favorite link of a tab while Today stamps the same tab', async () => {
  const tabs = new RacingFolderTabs([{ id: 1, active: true, pinned: true, url: 'https://web.whatsapp.com/' }]);
  const stamps = new ActivityStamps(tabs, () => 42, silentLogger());
  const favorite = { id: 'w', title: 'WhatsApp', url: 'https://web.whatsapp.com/' };
  await Promise.all([new LinkedTabs(tabs).link(1, favorite, 7), stamps.stamp(1)]);
  assert.deepEqual(ownOf(tabs, 1), { favoriteId: 'w', pinnedUrl: favorite.url, lastActive: 42 });
  assert.equal(TabData.of(tabs.tabs.get(1) as chrome.tabs.Tab), '7');
});

test('keeps the data Vivaldi stored in a tab when VivArcDi writes its own', async () => {
  const vivaldi = { ext_id: 'abc', parent_ext_id: 'def', workspaceId: 5 };
  const tabs = new RacingFolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify(vivaldi) }]);
  const stamps = new ActivityStamps(tabs, () => 42, silentLogger());
  await Promise.all([stamps.stamp(1), stamps.stamp(1)]);
  assert.deepEqual(TabData.extDataOf(tabs.tabs.get(1) as chrome.tabs.Tab), { ...vivaldi, vivarcdi: { lastActive: 42 } });
});
