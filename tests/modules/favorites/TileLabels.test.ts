import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { LabelKeys, LinkLabels } from '../../../src/core/browser/LinkLabels.js';
import type { BrowserBookmarks } from '../../../src/core/browser/bookmarks/BrowserBookmarks.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { BookmarkFavorites } from '../../../src/modules/favorites/BookmarkFavorites.js';
import { LABEL_KEY_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { PinnedFavorites } from '../../../src/modules/favorites/PinnedFavorites.js';
import { HiddenTabs } from '../../../src/shared/tabs/HiddenTabs.js';
import { asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { SvgDocument } from '../../shared/icons/fakes.js';
import { bookmarkTree, FakeBookmarks, FolderTabs, folder, link } from '../folders/fakes.js';
import type { FolderTab } from '../folders/fakes.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { own } from './linked.js';

const FOLDER = 'Importati da Firefox/Bookmarks Bar/Favorites';
const WHATSAPP = 'https://web.whatsapp.com/';
const catalog = new SelectorCatalog({ browser: '#browser', tabListHost: '.list' }, 'test');
const inWorkspace = (id: number): string => JSON.stringify({ workspaceId: id });

const installFakes = (t: TestContext): void => {
  const globals = globalThis as unknown as Record<string, unknown>;
  globals['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => delete globals['MutationObserver']);
};

const titleOf = (tile: DomNode | undefined): string | undefined => (tile as unknown as { title?: string } | undefined)?.title;
const sourceOf = (icon: DomNode | undefined): string | undefined => (icon as unknown as { src?: string } | undefined)?.src;

const tilesOf = (element: HTMLElement): DomNode[] => (element as unknown as DomNode).children;

interface Setup {
  labels: LinkLabels;
  tabs: FolderTabs;
  favorites: BookmarkFavorites;
}

async function bookmarkSetup(t: TestContext, tabs: FolderTab[]): Promise<Setup> {
  installFakes(t);
  const fake = new FolderTabs(tabs);
  const bookmarks = new FakeBookmarks(bookmarkTree([folder('f', 'Favorites', [link('w', 'WhatsApp', WHATSAPP), link('r', 'Reddit', 'https://www.reddit.com/')])]));
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  const favorites = new BookmarkFavorites({
    document: asDocument(new SvgDocument()),
    selectors: catalog,
    tabs: fake as never,
    bookmarks: bookmarks as unknown as BrowserBookmarks,
    logger: silentLogger(),
    labels,
    folder: FOLDER,
    maxTiles: 12,
    hiddenTabs: new HiddenTabs(),
    onChange: (): void => undefined,
  });
  await favorites.start();
  await settle();
  t.after(() => favorites.stop());
  return { labels, tabs: fake, favorites };
}

test('shows the name and icon of a tile in every workspace', async (t) => {
  const { labels, tabs, favorites } = await bookmarkSetup(t, [{ id: 1, active: true, url: 'https://news.example/', vivExtData: inWorkspace(7) }]);
  await labels.set(LabelKeys.bookmark('w'), { name: 'Chat', icon: { emoji: '💬' } });
  await settle();
  const describeTiles = (): Array<[string | undefined, string | undefined, string | null]> =>
    tilesOf(favorites.element).map((tile) => [titleOf(tile), tile.children[0]?.textContent, tile.getAttribute(LABEL_KEY_ATTRIBUTE)]);
  const inFirst = describeTiles();
  assert.deepEqual(inFirst, [
    ['Chat', '💬', 'bookmark:w'],
    ['Reddit', 'R', 'bookmark:r'],
  ]);

  tabs.tabs.set(1, { id: 1, windowId: 1, active: true, url: 'https://news.example/', vivExtData: inWorkspace(8) });
  tabs.updated.forEach((listener) => listener(1, {}, {} as chrome.tabs.Tab));
  await settle();
  assert.deepEqual(describeTiles(), inFirst);

  await labels.set(LabelKeys.bookmark('w'), { icon: { symbol: 'star' } });
  assert.equal(tilesOf(favorites.element)[0]?.children[0]?.children[0]?.tagName, 'SVG');
  await labels.clear(LabelKeys.bookmark('w'));
  assert.deepEqual(describeTiles()[0], ['WhatsApp', 'W', 'bookmark:w']);
});

test('a tile draws the favicon of its label and an unknown symbol draws the service favicon', async (t) => {
  const { labels, favorites } = await bookmarkSetup(t, []);
  const favicon = 'https://web.whatsapp.com/new.png';
  await labels.set(LabelKeys.bookmark('w'), { favicon });
  await labels.set(LabelKeys.bookmark('r'), { icon: { symbol: 'nothing' } });
  const [first, second] = tilesOf(favorites.element);
  assert.equal(sourceOf(first?.children[1]), favicon);
  assert.equal(sourceOf(second?.children[1]), 'chrome://favicon/size/16@2x/https://www.reddit.com/');
});

const pinned = (id: number, extra: Partial<FolderTab> = {}): FolderTab => ({
  id,
  index: id,
  pinned: true,
  url: `https://site${id}.example/`,
  title: `Site ${id}`,
  vivExtData: inWorkspace(7),
  ...extra,
});

async function pinnedSetup(t: TestContext, tabs: FolderTab[]): Promise<{ labels: LinkLabels; favorites: PinnedFavorites }> {
  installFakes(t);
  const labels = LinkLabels.of(new MemoryStorage(), silentLogger());
  const favorites = new PinnedFavorites({
    document: asDocument(new SvgDocument()),
    selectors: catalog,
    tabs: new FolderTabs(tabs),
    logger: silentLogger(),
    labels,
    maxTiles: 12,
    hiddenTabs: new HiddenTabs(),
    onChange: (): void => undefined,
  });
  await favorites.start();
  t.after(() => favorites.stop());
  return { labels, favorites };
}

test('the tile of a pinned tab carries the address key of its own page and shows its label', async (t) => {
  const tabs = [
    pinned(1, { active: true, vivExtData: own({ workspaceId: 7 }, undefined, 'https://www.mail.example/inbox') }),
    pinned(2, { url: 'vivaldi://settings' }),
  ];
  const { labels, favorites } = await pinnedSetup(t, tabs);
  const [mail, settings] = tilesOf(favorites.element);
  assert.equal(mail?.getAttribute(LABEL_KEY_ATTRIBUTE), 'page:mail.example/inbox');
  assert.equal(settings?.hasAttribute(LABEL_KEY_ATTRIBUTE), false);

  await labels.set('page:mail.example/inbox', { name: 'Mail', icon: { emoji: '📧' } });
  const [labeled] = tilesOf(favorites.element);
  assert.deepEqual([titleOf(labeled), labeled?.children[0]?.textContent], ['Mail', '📧']);
});
