import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LinkEntry } from '../../../src/modules/folders/FolderTree.js';
import { LinkTabAdopter } from '../../../src/modules/folders/LinkTabAdopter.js';
import { TabLinks } from '../../../src/modules/folders/TabLinks.js';
import { LinkingTabs } from '../favorites/linked.js';
import { silentLogger } from '../reopen/fakes.js';
import type { FolderTab } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const MAHJONG_LINK: LinkEntry = { kind: 'link', id: '11', title: 'Mahjong Soul', url: MAHJONG, key: 'mahjongsoul.game.yo-star.com', depth: 0 };
const NIX_LINK: LinkEntry = { kind: 'link', id: '13', title: 'Nix manual', url: 'https://nixos.org/manual', key: 'nixos.org/manual', depth: 1 };
const WORK = JSON.stringify({ workspaceId: 7 });
const OTHER_WORK = JSON.stringify({ workspaceId: 8 });
const HOME: FolderTab = { id: 1, active: true, url: 'https://example.com/', vivExtData: WORK };

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

function setup(tabs: LinkingTabs): LinkTabAdopter {
  return new LinkTabAdopter(tabs, () => [MAHJONG_LINK, NIX_LINK], new TabLinks(tabs), silentLogger());
}

const bookmarkOf = (tabs: LinkingTabs, tabId: number): unknown => (tabs.extData(tabId)['vivarcdi'] as { bookmarkId?: string } | undefined)?.bookmarkId;

test('adopts a new tab that opens the address of a link', async () => {
  const tabs = new LinkingTabs([HOME]);
  const adopter = setup(tabs);
  adopter.start();
  tabs.open({ id: 5, url: 'chrome://vivaldi-webui/startpage', vivExtData: WORK });
  tabs.navigate(5, `${MAHJONG}?lang=it`);
  await settle();
  assert.equal(bookmarkOf(tabs, 5), '11');
  assert.equal(tabs.extData(5)['workspaceId'], 7);
  adopter.stop();
  assert.equal(tabs.listenerCount(), 0);
});

test('never adopts a tab that already showed a web page', async () => {
  const tabs = new LinkingTabs([HOME]);
  const adopter = setup(tabs);
  adopter.start();
  tabs.open({ id: 5, url: 'chrome://vivaldi-webui/startpage', vivExtData: WORK });
  tabs.navigate(5, 'https://news.example/');
  tabs.navigate(5, MAHJONG);
  tabs.open({ id: 6, url: 'https://news.example/', vivExtData: WORK });
  tabs.navigate(6, MAHJONG);
  await settle();
  assert.equal(bookmarkOf(tabs, 5), undefined);
  assert.equal(bookmarkOf(tabs, 6), undefined);
  adopter.stop();
});

test('does not adopt a new tab for a link that has a tab in its workspace', async () => {
  const tabs = new LinkingTabs([HOME, { id: 2, url: MAHJONG, vivExtData: JSON.stringify({ workspaceId: 7, vivarcdi: { bookmarkId: '11' } }) }]);
  const adopter = setup(tabs);
  adopter.start();
  tabs.open({ id: 5, url: 'chrome://vivaldi-webui/startpage', vivExtData: WORK });
  tabs.navigate(5, MAHJONG);
  tabs.open({ id: 6, url: 'chrome://vivaldi-webui/startpage', vivExtData: OTHER_WORK });
  tabs.navigate(6, MAHJONG);
  await settle();
  assert.equal(bookmarkOf(tabs, 5), undefined);
  assert.equal(bookmarkOf(tabs, 6), '11');
  adopter.stop();
});

test('adopts the tabs open at start once for each link and workspace', async () => {
  const tabs = new LinkingTabs([
    HOME,
    { id: 2, url: `${MAHJONG}?lang=it`, vivExtData: WORK },
    { id: 3, url: MAHJONG, vivExtData: WORK },
    { id: 4, url: MAHJONG, vivExtData: OTHER_WORK },
    { id: 5, pinned: true, url: 'https://nixos.org/manual', vivExtData: WORK },
    { id: 6, url: 'https://elsewhere.example/', vivExtData: WORK },
  ]);
  await setup(tabs).adoptOpenTabs();
  assert.deepEqual([2, 3, 4, 5, 6].map((id) => bookmarkOf(tabs, id)), ['11', undefined, '11', undefined, undefined]);
});

test('keeps going when a tab cannot be linked', async () => {
  const tabs = new LinkingTabs([HOME, { id: 2, url: MAHJONG, vivExtData: WORK }]);
  tabs.failing.add('update');
  await setup(tabs).adoptOpenTabs();
  assert.equal(bookmarkOf(tabs, 2), undefined);
});
