import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserWindows } from '../../../src/core/BrowserWindows.js';
import type { ChromeApi } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import { Debounce } from '../../../src/modules/workspacesync/Debounce.js';
import { LocalPinned } from '../../../src/modules/workspacesync/LocalPinned.js';
import { MissingSpaces } from '../../../src/modules/workspacesync/MissingSpaces.js';
import { SyncBase } from '../../../src/modules/workspacesync/SyncBase.js';
import { SyncStore } from '../../../src/modules/workspacesync/SyncStore.js';
import { WindowOwner } from '../../../src/modules/workspacesync/WindowOwner.js';
import { own } from '../favorites/linked.js';
import { WritableChrome, bookmarkTree } from '../folders/fakes.js';
import { MemoryStorage } from '../reopen/fakes.js';
import { CountingSink, FOLDER, FakeNames, PinningTabs, page, pinnedIn, pinnedTab } from './fakes.js';
import { ManualTimers } from '../copyurl/fakes.js';

const windowsOf = (current: number, all: Array<{ id?: number; incognito?: boolean }>): BrowserWindows =>
  new BrowserWindows({
    windows: {
      create: (): void => undefined,
      getCurrent: (callback: (details: unknown) => void): void => callback({ id: current }),
      getAll: (_info: unknown, callback: (details: unknown) => void): void => callback(all),
    },
  } as unknown as ChromeApi);

test('lists the normal windows that are not private, lowest id first', async () => {
  const windows = windowsOf(1, [{ id: 9 }, { id: 3, incognito: true }, {}, { id: 4 }]);
  assert.deepEqual(await windows.normalIds(), [4, 9]);
});

test('the window with the lowest id is the owner', async () => {
  assert.equal(await new WindowOwner(windowsOf(4, [{ id: 9 }, { id: 4 }])).ownId(), 4);
  assert.equal(await new WindowOwner(windowsOf(9, [{ id: 9 }, { id: 4 }])).ownId(), null);
  assert.equal(await new WindowOwner(windowsOf(9, [{ id: 9 }])).ownId(), 9);
  assert.equal(await new WindowOwner(windowsOf(9, [])).ownId(), null);
});

test('remembers the base of each workspace and ignores a damaged one', () => {
  const storage = new MemoryStorage();
  const base = new SyncBase(storage);
  assert.equal(base.get('Casetta'), null);
  base.set('Casetta', ['a', 'b']);
  base.set(null, ['c']);
  assert.deepEqual(base.get('Casetta'), ['a', 'b']);
  assert.deepEqual(base.get(null), ['c']);
  assert.deepEqual(base.get('Work'), null);
  storage.setItem('vivarcdi.sync.base.Work', '{"x":1}');
  assert.equal(base.get('Work'), null);
  storage.setItem('vivarcdi.sync.base.Work', 'not json');
  assert.equal(base.get('Work'), null);
});

test('shows a missing space again only when it is new', () => {
  const storage = new MemoryStorage();
  const shown: string[] = [];
  const missing = new MissingSpaces(storage, (text) => shown.push(text));
  missing.announce([]);
  missing.announce(['Work']);
  new MissingSpaces(storage, (text) => shown.push(text)).announce(['Work']);
  missing.announce(['Work', 'Home']);
  assert.equal(shown.length, 2);
  assert.match(shown[1] ?? '', /Home/);
  assert.doesNotMatch(shown[1] ?? '', /Work/);
  storage.setItem('vivarcdi.sync.announced', 'broken');
  missing.announce(['Work']);
  assert.equal(shown.length, 3);
});

test('runs once after a burst of requests', () => {
  const timers = new ManualTimers();
  let runs = 0;
  const debounce = new Debounce(() => (runs += 1), 500, timers);
  debounce.request();
  debounce.request();
  debounce.request();
  assert.equal(timers.pending.size, 1);
  assert.deepEqual([...timers.pending.values()].map(({ delayMs }) => delayMs), [500]);
  timers.fire();
  assert.equal(runs, 1);
  debounce.request();
  debounce.cancel();
  assert.equal(timers.pending.size, 0);
  assert.equal(runs, 1);
});

test('reads pinned tabs by workspace and leaves out what the store cannot carry', async () => {
  const sink = new CountingSink();
  const tabs = new PinningTabs([
    pinnedTab(1, 'mail'),
    pinnedTab(2, 'docs', { vivExtData: own({ workspaceId: 8 }, undefined, page('docs')) }),
    pinnedTab(3, 'free', { vivExtData: own({}, undefined, page('free')) }),
    pinnedTab(4, 'fav', { vivExtData: own({ workspaceId: 7 }, 'f1', page('fav')) }),
    pinnedTab(5, 'settings', { url: 'vivaldi://settings', vivExtData: JSON.stringify({ workspaceId: 7 }) }),
    pinnedTab(6, 'away', { url: 'https://other.example/', vivExtData: own({ workspaceId: 7 }, undefined, page('away')) }),
    pinnedTab(7, 'closed', { pinned: false }),
  ]);
  const local = new LocalPinned(tabs, new FakeNames({ '7': 'Casetta' }), new Logger('test', sink));
  const groups = await local.read(1);
  assert.deepEqual([...groups.keys()], ['Casetta', null]);
  assert.deepEqual(groups.get('Casetta')?.map(({ tabId, away }) => [tabId, away]), [[1, false], [6, true]]);
  assert.deepEqual(groups.get(null)?.map(({ entry }) => entry.key), ['free.example']);
  assert.equal(sink.warnings.length, 1);
  await local.read(1);
  assert.equal(sink.warnings.length, 1);
  assert.deepEqual(LocalPinned.distinct([...(groups.get('Casetta') ?? []), ...(groups.get('Casetta') ?? [])]).length, 2);
});

test('rebuilds the copy only when the order differs and renames changed titles', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  const store = new SyncStore(chrome.reader, chrome.writer, FOLDER);
  const entry = (name: string, title = name): { key: string; title: string; url: string } => ({ key: `${name}.example`, title, url: page(name) });
  await store.writePinned('Casetta', [entry('a'), entry('b'), entry('c')]);
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['a', 'b', 'c']);
  const before = chrome.calls.length;
  await store.writePinned('Casetta', [entry('a'), entry('n'), entry('b', 'Bee')]);
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['a', 'n', 'Bee']);
  assert.equal(chrome.calls.slice(before).some((call) => call.startsWith('removeTree')), false);
  await store.writePinned('Casetta', [entry('n'), entry('a')]);
  assert.deepEqual(pinnedIn(chrome, 'Casetta'), ['n', 'a']);
  const spaces = await store.spaces();
  assert.deepEqual([...spaces.keys()], ['Casetta']);
  assert.deepEqual(spaces.get('Casetta')?.pinned.map(({ key }) => key), ['n.example', 'a.example']);
  assert.equal(spaces.get('Casetta')?.settings, null);
});

test('reading an empty store creates nothing', async () => {
  const chrome = new WritableChrome(bookmarkTree([]));
  assert.equal((await new SyncStore(chrome.reader, chrome.writer, FOLDER).spaces()).size, 0);
  assert.deepEqual(chrome.calls, ['getTree']);
});
