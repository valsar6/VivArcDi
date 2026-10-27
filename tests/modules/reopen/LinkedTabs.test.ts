import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleContext } from '../../../src/core/Module.js';
import type { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { ReopenPinned } from '../../../src/modules/reopen/ReopenPinned.js';
import { LAST_OPENED_STORAGE_KEY } from '../../../src/modules/reopen/LastOpenedStore.js';
import { bookmarkTree, folder, link, recordingChrome } from '../folders/fakes.js';
import { MemoryStorage, ReopenTabs, settle, silentLogger } from './fakes.js';

const NIX = 'https://nixos.org/manual';
const TREE = bookmarkTree([folder('10', 'Hobbies', [link('11', 'Nix manual', NIX)])]);

async function start(tabs: ReopenTabs, bookmarks: BrowserBookmarks = recordingChrome(TREE).bookmarks): Promise<MemoryStorage> {
  const storage = new MemoryStorage();
  const context = {
    document: {},
    storage,
    logger: silentLogger(),
    options: {},
    tabs,
    bookmarks,
    modules: { 'bookmark-folders': { enabled: true, root: 'Importati da Firefox/Bookmarks Bar' } },
  } as unknown as ModuleContext;
  new ReopenPinned().start(context);
  await settle();
  return storage;
}

async function openFromNewTab(tabs: ReopenTabs, url: string): Promise<void> {
  tabs.create({ id: 99, windowId: 1, url: 'chrome://vivaldi-webui/startpage' });
  tabs.emit(99, { url });
  await settle();
  await settle();
}

test('reopen switches to the open tab of a bookmark', async () => {
  const tabs = new ReopenTabs([{ id: 5, windowId: 1, pinned: false, url: `${NIX}?q=1` }]);
  await start(tabs);
  await openFromNewTab(tabs, NIX);
  assert.deepEqual(tabs.actions(), [
    ['activate', 5],
    ['remove', 99],
  ]);
});

test('reopen leaves addresses that are not bookmarks or pinned tabs alone', async () => {
  const tabs = new ReopenTabs([{ id: 5, windowId: 1, pinned: false, url: 'https://example.com/other' }]);
  await start(tabs);
  await openFromNewTab(tabs, 'https://example.com/other');
  assert.deepEqual(tabs.actions(), []);
});

test('records the last opened date of tabs that match a bookmark', async () => {
  const tabs = new ReopenTabs([
    { id: 5, windowId: 1, pinned: false, url: NIX },
    { id: 6, windowId: 1, pinned: false, url: 'https://example.com/other' },
  ]);
  const storage = await start(tabs);
  tabs.activateByUser(6);
  await settle();
  assert.equal(storage.getItem(LAST_OPENED_STORAGE_KEY), null);
  tabs.activateByUser(5);
  await settle();
  const saved = JSON.parse(storage.getItem(LAST_OPENED_STORAGE_KEY) ?? '{}') as Record<string, number>;
  assert.deepEqual(Object.keys(saved), ['nixos.org/manual']);
});
