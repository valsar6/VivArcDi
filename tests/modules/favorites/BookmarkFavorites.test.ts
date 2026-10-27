import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabUnloader } from '../../../src/core/TabUnloader.js';
import { FavoriteOpener } from '../../../src/modules/favorites/FavoriteOpener.js';
import { FavoriteStates } from '../../../src/modules/favorites/FavoriteStates.js';
import { FavoriteTagger } from '../../../src/modules/favorites/FavoriteTagger.js';
import { FavoritesFolder } from '../../../src/modules/favorites/FavoritesFolder.js';
import type { Favorite } from '../../../src/modules/favorites/FavoritesFolder.js';
import { CURRENT_ATTRIBUTE, DIMMED_ATTRIBUTE, FavoritesView, TILE_ATTRIBUTE } from '../../../src/modules/favorites/FavoritesView.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { bookmarkTree, FakeBookmarks, folder, link } from '../folders/fakes.js';
import { FakeNode, selectors } from './fakes.js';
import { LinkingTabs, own, silentLogger } from './linked.js';

const FOLDER = 'Importati da Firefox/Bookmarks Bar/Favorites';

const whatsapp: Favorite = { id: 'w', title: 'WhatsApp', url: 'https://web.whatsapp.com/' };
const reddit: Favorite = { id: 'r', title: 'Reddit', url: 'https://www.reddit.com/' };

const favoritesTree = (children = [link('w', 'WhatsApp', whatsapp.url), link('r', 'Reddit', reddit.url)]): ReturnType<typeof bookmarkTree> =>
  bookmarkTree([folder('f', 'Favorites', children)]);

const opener = (tabs: LinkingTabs): FavoriteOpener => {
  const links = new LinkedTabs(tabs);
  return new FavoriteOpener(tabs, links, new TabUnloader(tabs), silentLogger);
};

test('lists the web links of the favorites folder in order', async () => {
  const bookmarks = new FakeBookmarks(
    favoritesTree([
      link('w', 'WhatsApp', whatsapp.url),
      folder('sub', 'Sub', [link('x', 'Inner', 'https://inner.example/')]),
      { id: 's', title: '', separator: true },
      link('js', 'Script', 'javascript:alert(1)'),
      link('r', 'Reddit', reddit.url),
    ]),
  );
  const received: Array<Favorite[] | null> = [];
  await new FavoritesFolder(bookmarks, FOLDER, (favorites) => received.push(favorites)).start();
  assert.deepEqual(received, [[whatsapp, reddit]]);
});

test('rebuilds the favorites when the folder changes', async () => {
  const bookmarks = new FakeBookmarks(favoritesTree());
  const received: Array<Favorite[] | null> = [];
  const favorites = new FavoritesFolder(bookmarks, FOLDER, (list) => received.push(list));
  await favorites.start();
  bookmarks.change(favoritesTree([link('r', 'Reddit!', reddit.url)]));
  await new Promise((resolve) => setImmediate(resolve));
  bookmarks.change(bookmarkTree([]));
  await new Promise((resolve) => setImmediate(resolve));
  favorites.stop();
  assert.deepEqual(received, [[whatsapp, reddit], [{ ...reddit, title: 'Reddit!' }], null]);
  assert.equal(bookmarks.listeners.size, 0);
});

test('activates the linked tab of a favorite', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, url: 'https://news.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, pinned: true, discarded: true, url: whatsapp.url, vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
    { id: 3, pinned: true, url: whatsapp.url, vivExtData: own({ workspaceId: 8 }, 'w', whatsapp.url) },
  ]);
  await opener(tabs).open(whatsapp);
  assert.deepEqual(tabs.actions(), [
    ['activate', 2],
    ['reload', 2],
  ]);
});

test('opens a pinned linked tab for a favorite without one', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, url: 'https://news.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 3, pinned: true, url: whatsapp.url, vivExtData: own({ workspaceId: 8 }, 'w', whatsapp.url) },
  ]);
  tabs.nextId = 50;
  await opener(tabs).open(whatsapp);
  assert.deepEqual(tabs.actions()[0], ['create', { url: whatsapp.url, pinned: true, active: true }]);
  assert.deepEqual(tabs.extData(50), { workspaceId: 7, vivarcdi: { favoriteId: 'w', pinnedUrl: whatsapp.url } });
});

test('hides linked tabs and mirrors their state on the tile', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, pinned: true, url: whatsapp.url, vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
    { id: 2, pinned: true, discarded: true, url: reddit.url, vivExtData: own({ workspaceId: 8 }, 'r', reddit.url) },
    { id: 3, url: 'https://news.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  const snapshot = await new LinkedTabs(tabs).snapshot();
  const document = new DomDocument();
  const view = new FavoritesView(asDocument(document), { open: (): void => undefined, unload: (): void => undefined });
  view.show([whatsapp, reddit]);
  view.apply(FavoriteStates.of([whatsapp, reddit], snapshot));
  const [whatsappTile, redditTile] = (view.element as unknown as DomNode).children;
  assert.equal(whatsappTile?.getAttribute(TILE_ATTRIBUTE), 'w');
  assert.deepEqual([whatsappTile?.hasAttribute(CURRENT_ATTRIBUTE), whatsappTile?.hasAttribute(DIMMED_ATTRIBUTE)], [true, false]);
  assert.deepEqual([redditTile?.hasAttribute(CURRENT_ATTRIBUTE), redditTile?.hasAttribute(DIMMED_ATTRIBUTE)], [false, true]);

  const slot = (id: number): FakeNode => {
    const node = new FakeNode([], [new FakeNode(['wrapper'])]);
    const wrapper = node.children[0];
    if (wrapper !== undefined) {
      wrapper.dataset['id'] = `tab-${id}`;
    }
    return node;
  };
  const slots = [slot(1), slot(2), slot(3)];
  const tabBar = new FakeNode(['#tabs-tabbar-container', 'vertical'], [new FakeNode(['strip'], slots)]);
  new FavoriteTagger(selectors, 0, { has: (): boolean => false }, snapshot.linkedTabIds).apply(tabBar as unknown as Element);
  assert.deepEqual(
    slots.map((node) => node.hasAttribute('data-vivarcdi-hidden')),
    [true, true, false],
  );
});

test('unlinks tabs of a removed favorite', async () => {
  const tabs = new LinkingTabs([
    { id: 2, pinned: true, url: reddit.url, vivExtData: own({ workspaceId: 7 }, 'r', reddit.url) },
    { id: 3, pinned: true, url: whatsapp.url, vivExtData: own({ workspaceId: 7 }, 'w', 'https://old.whatsapp.com/') },
  ]);
  await new LinkedTabs(tabs).sync([whatsapp]);
  assert.deepEqual(tabs.extData(2), { workspaceId: 7, vivarcdi: { pinnedUrl: reddit.url } });
  assert.deepEqual(tabs.extData(3), { workspaceId: 7, vivarcdi: { favoriteId: 'w', pinnedUrl: whatsapp.url } });
});
