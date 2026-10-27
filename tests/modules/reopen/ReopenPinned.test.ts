import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleContext } from '../../../src/core/Module.js';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { ReopenPinned } from '../../../src/modules/reopen/ReopenPinned.js';
import type { FakeTab } from '../favorites/fakes.js';
import { MemoryStorage, ReopenTabs, settle, silentLogger } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';

function start(pinned: FakeTab[]): ReopenTabs {
  const tabs = new ReopenTabs(pinned);
  const context = {
    document: {},
    storage: new MemoryStorage(),
    logger: silentLogger(),
    options: {},
    tabs,
    bookmarks: new BrowserBookmarks(undefined),
    modules: {},
  } as unknown as ModuleContext;
  new ReopenPinned().start(context);
  return tabs;
}

async function openFromNewTab(tabs: ReopenTabs, url: string, extra: Partial<FakeTab> = {}): Promise<void> {
  tabs.create({ id: 99, windowId: 1, url: 'chrome://vivaldi-webui/startpage', ...extra });
  tabs.emit(99, { url });
  await settle();
  await settle();
}

test('switches to the pinned tab and closes the new tab', async () => {
  const tabs = start([{ id: 1, pinned: true, windowId: 1, url: `${MAHJONG}?lang=it` }]);
  await openFromNewTab(tabs, MAHJONG);
  assert.deepEqual(tabs.actions(), [
    ['activate', 1],
    ['remove', 99],
  ]);
});

test('reloads an unloaded pinned tab when switching', async () => {
  const tabs = start([{ id: 1, pinned: true, windowId: 1, url: MAHJONG, discarded: true }]);
  await openFromNewTab(tabs, MAHJONG);
  assert.deepEqual(tabs.actions(), [
    ['activate', 1],
    ['reload', 1],
    ['remove', 99],
  ]);
});

test('picks the most recently opened match', async () => {
  const tabs = start([
    { id: 1, pinned: true, windowId: 1, url: MAHJONG, lastAccessed: 100 },
    { id: 2, pinned: true, windowId: 1, url: MAHJONG, lastAccessed: 300 },
    { id: 3, pinned: true, windowId: 1, url: MAHJONG, lastAccessed: 200 },
  ]);
  await openFromNewTab(tabs, MAHJONG);
  assert.deepEqual(tabs.actions()[0], ['activate', 2]);
});

test('keeps the new tab when the switch fails', async () => {
  const tabs = start([{ id: 1, pinned: true, windowId: 1, url: MAHJONG }]);
  tabs.failing.add('activate');
  await openFromNewTab(tabs, MAHJONG);
  assert.deepEqual(tabs.actions(), []);
  assert.ok(tabs.tabs.has(99));
});

test('leaves pinned tabs of other workspaces and unpinned tabs alone', async () => {
  const tabs = start([
    { id: 1, pinned: true, windowId: 1, url: MAHJONG, vivExtData: JSON.stringify({ workspaceId: 2 }) } as FakeTab,
    { id: 2, pinned: false, windowId: 1, url: MAHJONG },
  ]);
  await openFromNewTab(tabs, MAHJONG, { vivExtData: JSON.stringify({ workspaceId: 1 }) } as Partial<FakeTab>);
  assert.deepEqual(tabs.actions(), []);
});

test('reuses a Favorite shared by every workspace', async () => {
  const tabs = start([{ id: 1, pinned: true, windowId: 1, url: MAHJONG }]);
  await openFromNewTab(tabs, MAHJONG, { vivExtData: JSON.stringify({ workspaceId: 1 }) } as Partial<FakeTab>);
  assert.deepEqual(tabs.actions()[0], ['activate', 1]);
});

test('reopen module stays off without tab events', () => {
  const context = {
    document: {},
    logger: silentLogger(),
    options: {},
    bookmarks: new BrowserBookmarks(undefined),
    modules: {},
    tabs: { available: true, onCreated: (): never => { throw new Error('missing'); }, onActivated: (): (() => void) => () => {}, onUpdated: (): (() => void) => () => {} },
  } as unknown as ModuleContext;
  assert.doesNotThrow(() => new ReopenPinned().start(context));
});

test('reuses a pinned tab that left its own page', async () => {
  const vivExtData = JSON.stringify({ vivarcdi: { pinnedUrl: MAHJONG } });
  const tabs = start([{ id: 1, pinned: true, windowId: 1, url: 'https://elsewhere.example/', vivExtData } as FakeTab]);
  await openFromNewTab(tabs, MAHJONG);
  assert.deepEqual(tabs.actions()[0], ['activate', 1]);
});
