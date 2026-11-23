import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabUnloader } from '../../../src/core/tabs/TabUnloader.js';
import { FavoriteOpener } from '../../../src/modules/favorites/FavoriteOpener.js';
import { FavoriteStates } from '../../../src/modules/favorites/FavoriteStates.js';
import type { Favorite } from '../../../src/modules/favorites/FavoritesFolder.js';
import { FavoritesView } from '../../../src/modules/favorites/FavoritesView.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { OwnPage } from '../../../src/shared/tabs/OwnPage.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { settle } from '../reopen/fakes.js';
import { LinkingTabs, own, silentLogger } from './linked.js';

const AWAY_ATTRIBUTE = 'data-vivarcdi-away';

const whatsapp: Favorite = { id: 'w', title: 'WhatsApp', url: 'https://web.whatsapp.com/' };
const reddit: Favorite = { id: 'r', title: 'Reddit', url: 'https://www.reddit.com/' };

const inWorkspace = (id: number): string => JSON.stringify({ workspaceId: id });

const openerOf = (tabs: LinkingTabs): FavoriteOpener =>
  new FavoriteOpener(tabs, new LinkedTabs(tabs), new TabUnloader(tabs), silentLogger);

const sourceOf = (icon: DomNode | undefined): string | undefined => (icon as unknown as { src?: string } | undefined)?.src;

const tilesOf = (view: FavoritesView): DomNode[] => (view.element as unknown as DomNode).children;

const press = (tile: DomNode | undefined): void =>
  tile?.bubble({ type: 'click', target: tile, button: 0, preventDefault: (): void => undefined, stopPropagation: (): void => undefined } as unknown as Event);

test('keeps the bookmark page when a favorite tab navigates', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, url: 'https://news.example/', vivExtData: inWorkspace(7) },
    { id: 2, pinned: true, url: whatsapp.url, vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
  ]);
  tabs.navigate(2, 'https://web.whatsapp.com/away');
  const linked = (await new LinkedTabs(tabs).snapshot()).linked.get('w');
  assert.equal(OwnPage.of(linked as chrome.tabs.Tab), whatsapp.url);
  assert.equal((await tabs.get(2)).url, 'https://web.whatsapp.com/away');
});

test('does not mark a favorite tile that left its own page', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, url: 'https://news.example/', vivExtData: inWorkspace(7) },
    { id: 2, pinned: true, url: 'https://web.whatsapp.com/away', vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
  ]);
  const snapshot = await new LinkedTabs(tabs).snapshot();
  const document = new DomDocument();
  const view = new FavoritesView(asDocument(document), { open: (): void => undefined, unload: (): void => undefined });
  view.show([whatsapp]);
  view.apply(FavoriteStates.of([whatsapp], snapshot));
  const [tile] = tilesOf(view);
  assert.equal(tile?.hasAttribute(AWAY_ATTRIBUTE), false);
  assert.equal(sourceOf(tile?.children[1]), FavoritesView.iconOf(whatsapp.url));
});

test('loads the bookmark page when an unloaded favorite tile opens', async () => {
  const tabs = new LinkingTabs([
    { id: 1, active: true, url: 'https://news.example/', vivExtData: inWorkspace(7) },
    { id: 2, pinned: true, discarded: true, url: 'https://web.whatsapp.com/away', vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
  ]);
  await openerOf(tabs).open(whatsapp);
  assert.deepEqual(tabs.actions(), [
    ['activate', 2],
    ['update', 2, { url: whatsapp.url }],
  ]);
});

test('a click on the tile of an away tab activates it without resetting it', async () => {
  const tabs = new LinkingTabs([
    { id: 3, active: true, pinned: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({ workspaceId: 7 }, 'r', reddit.url) },
    { id: 2, pinned: true, url: 'https://web.whatsapp.com/away', vivExtData: own({ workspaceId: 7 }, 'w', whatsapp.url) },
  ]);
  const opener = openerOf(tabs);
  const view = new FavoritesView(asDocument(new DomDocument()), {
    open: (favorite): void => void opener.open(favorite),
    unload: (): void => undefined,
  });
  view.show([whatsapp, reddit]);
  const [whatsappTile, redditTile] = tilesOf(view);
  press(whatsappTile);
  await settle();
  press(redditTile);
  await settle();
  assert.deepEqual(tabs.actions(), [['activate', 2]]);
  assert.deepEqual([await tabs.get(2), await tabs.get(3)].map((tab) => tab.url), [
    'https://web.whatsapp.com/away',
    'https://www.reddit.com/r/vivaldi',
  ]);
});
