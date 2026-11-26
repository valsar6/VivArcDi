import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceTabs } from '../../../src/core/workspaces/WorkspaceTabs.js';
import { ActivityStamps } from '../../../src/modules/today/ActivityStamps.js';
import { ArchiveStore } from '../../../src/modules/today/ArchiveStore.js';
import { ArchiveSweeper } from '../../../src/modules/today/ArchiveSweeper.js';
import { silentNotices, RecordingToast } from '../../loader/fakes.js';
import { Notices } from '../../../src/core/dom/Notices.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { HOUR, ManualTimer, NOW, OutcomeStorage, TodayTabs, stamped } from './fakes.js';
import type { FolderTab } from '../folders/fakes.js';

const ACTIVE: FolderTab = { id: 1, active: true, url: 'https://active.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) };

function setup(tabs: FolderTab[], clock = { now: NOW }): { tabs: TodayTabs; store: ArchiveStore; sweeper: ArchiveSweeper; stamps: ActivityStamps; timer: ManualTimer } {
  const fake = new TodayTabs(tabs);
  const store = new ArchiveStore(new MemoryStorage(), 500);
  const stamps = new ActivityStamps(fake, (): number => clock.now, silentLogger());
  const timer = new ManualTimer();
  const sweeper = new ArchiveSweeper({ tabs: fake, store, stamps, limitMs: 12 * HOUR, now: (): number => clock.now, repeat: timer.repeat, notices: silentNotices(), logger: silentLogger(), blank: new WorkspaceTabs(fake, silentLogger()) });
  return { tabs: fake, store, sweeper, stamps, timer };
}

test('archives a Today tab inactive past the limit', async () => {
  const { tabs, store, sweeper } = setup([
    ACTIVE,
    { id: 2, url: 'https://old.example/page', title: 'Old', favIconUrl: 'https://old.example/icon.png', vivExtData: stamped(NOW - 13 * HOUR, { workspaceId: 7 }) },
    { id: 3, url: 'https://recent.example/', title: 'Recent', vivExtData: stamped(NOW - 11 * HOUR) },
  ]);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), [2]);
  assert.deepEqual(store.entries, [{ url: 'https://old.example/page', title: 'Old', favIconUrl: 'https://old.example/icon.png', workspace: '7', archivedAt: NOW }]);
});

test('never archives protected tabs', async () => {
  const old = NOW - 100 * HOUR;
  const protectedTabs: FolderTab[] = [
    { ...ACTIVE, vivExtData: stamped(old) },
    { id: 2, pinned: true, url: 'https://pinned.example/', vivExtData: stamped(old) },
    { id: 3, pinned: true, url: 'https://favorite.example/', vivExtData: JSON.stringify({ vivarcdi: { favoriteId: 'f', lastActive: old } }) },
    { id: 4, url: 'https://stacked.example/', vivExtData: stamped(old, { group: 'stack-1' }) },
    { id: 5, audible: true, url: 'https://music.example/', vivExtData: stamped(old) },
    { id: 6, active: true, windowId: 2, url: 'https://other-window.example/', vivExtData: stamped(old) },
    { id: 7, url: 'vivaldi://settings', vivExtData: stamped(old) },
  ];
  const { tabs, store, sweeper } = setup(protectedTabs);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(store.entries.length, 0);
});

test('does not archive the tab of a link', async () => {
  const old = NOW - 100 * HOUR;
  const linked: FolderTab = { id: 2, url: 'https://jira.example/board', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11', lastActive: old } }) };
  const { tabs, store, sweeper } = setup([ACTIVE, linked]);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), []);
  const asActive = setup([{ ...linked, active: true }]);
  await asActive.sweeper.clear();
  assert.deepEqual(asActive.tabs.removedIds(), []);
  assert.equal(asActive.store.entries.length, 0);
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(store.entries.length, 0);
});

test('activation resets the timer', async () => {
  const clock = { now: NOW - 13 * HOUR };
  const { tabs, sweeper, stamps } = setup([ACTIVE, { id: 2, url: 'https://read.example/', vivExtData: stamped(NOW - 20 * HOUR) }], clock);
  await stamps.start();
  clock.now = NOW - HOUR;
  tabs.switchTo(2);
  tabs.switchTo(1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(tabs.lastActiveOf(2), NOW - HOUR);
  clock.now = NOW;
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), []);
  stamps.stop();
  assert.equal(tabs.listenerCount(), 0);
});

test('stamps a tab seen for the first time instead of archiving it', async () => {
  const { tabs, store, sweeper } = setup([ACTIVE, { id: 2, url: 'https://new.example/', lastAccessed: NOW - 50 * HOUR }]);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(tabs.lastActiveOf(2), NOW);
  assert.equal(store.entries.length, 0);
});

test('a later lastAccessed keeps a tab open', async () => {
  const { tabs, sweeper } = setup([ACTIVE, { id: 2, url: 'https://seen.example/', lastAccessed: NOW - HOUR, vivExtData: stamped(NOW - 20 * HOUR) }]);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), []);
});

const OLD: FolderTab = { id: 2, url: 'https://old.example/', vivExtData: stamped(NOW - 13 * HOUR) };

function outcomeSetup(storage: OutcomeStorage, notices: Notices = silentNotices()): { tabs: TodayTabs; store: ArchiveStore; sweeper: ArchiveSweeper } {
  const tabs = new TodayTabs([ACTIVE, OLD]);
  const store = new ArchiveStore(storage, 500);
  const stamps = new ActivityStamps(tabs, (): number => NOW, silentLogger());
  const sweeper = new ArchiveSweeper({ tabs, store, stamps, limitMs: 12 * HOUR, now: (): number => NOW, repeat: new ManualTimer().repeat, notices, logger: silentLogger(), blank: new WorkspaceTabs(tabs, silentLogger()) });
  return { tabs, store, sweeper };
}

test('closes archived tabs only after the save', async () => {
  const storage = new OutcomeStorage();
  let release: () => void = () => undefined;
  storage.hold = new Promise<void>((resolve) => { release = resolve; });
  const { tabs, sweeper } = outcomeSetup(storage);
  const sweeping = sweeper.sweep();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(tabs.removedIds(), []);
  release();
  await sweeping;
  assert.deepEqual(tabs.removedIds(), [2]);
});

test('keeps the tabs open when the archive cannot be saved', async () => {
  for (const outcome of ['failed', 'memory'] as const) {
    const storage = new OutcomeStorage();
    storage.outcome = outcome;
    const { tabs, store, sweeper } = outcomeSetup(storage);
    await sweeper.sweep();
    await sweeper.clear();
    assert.deepEqual(tabs.removedIds(), []);
    assert.deepEqual(store.entries, []);
  }
});

test('warns once when Today tabs stay open', async () => {
  const storage = new OutcomeStorage();
  storage.outcome = 'failed';
  const toast = new RecordingToast();
  const { sweeper } = outcomeSetup(storage, new Notices(toast));
  await sweeper.sweep();
  await sweeper.sweep();
  assert.equal(toast.shown.length, 1);
  assert.equal(toast.shown[0]?.kind, 'error');
});

const creates = (tabs: TodayTabs): unknown[][] => tabs.calls.filter(([name]) => name === 'create');

test('clear archives the active Today tab too', async () => {
  const { tabs, store, sweeper } = setup([
    ACTIVE,
    { id: 2, url: 'https://same.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) },
    { id: 3, url: 'https://other.example/', vivExtData: stamped(NOW, { workspaceId: 8 }) },
    { id: 4, pinned: true, url: 'https://pinned.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  await sweeper.clear();
  assert.deepEqual(tabs.removedIds(), [1, 2]);
  assert.deepEqual(store.entries.map(({ url }) => url).sort(), ['https://active.example/', 'https://same.example/']);
  assert.deepEqual(creates(tabs), []);
});

test('clear opens a blank tab when no tab is left to show', async () => {
  const { tabs, sweeper } = setup([
    ACTIVE,
    { id: 2, url: 'https://same.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) },
    { id: 3, url: 'https://other.example/', vivExtData: stamped(NOW, { workspaceId: 8 }) },
  ]);
  await sweeper.clear();
  assert.deepEqual(tabs.removedIds(), [1, 2]);
  assert.equal(creates(tabs).length, 1);
  const firstCreate = tabs.calls.findIndex(([name]) => name === 'create');
  const firstRemove = tabs.calls.findIndex(([name]) => name === 'remove');
  assert.ok(firstCreate >= 0 && firstCreate < firstRemove);
  assert.deepEqual(tabs.extData(100), { workspaceId: 7 });
});

test('clear opens the blank tab in the window of the active tab and shows it after the closing', async () => {
  const { tabs, sweeper } = setup([{ ...ACTIVE, windowId: 1 }]);
  await sweeper.clear();
  assert.deepEqual(creates(tabs), [['create', { windowId: 1, active: true }]]);
  const lastRemove = tabs.calls.map(([name]) => name).lastIndexOf('remove');
  const activation = tabs.calls.findIndex(([name, id, properties]) => name === 'update' && id === 100 && (properties as { active?: boolean }).active === true);
  assert.ok(activation > lastRemove);
});

test('clear opens no blank tab while a kept tab stays open', async () => {
  const kept: Record<string, FolderTab> = {
    pinned: { id: 4, pinned: true, url: 'https://pinned.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    favorite: { id: 4, pinned: true, url: 'https://favorite.example/', vivExtData: JSON.stringify({ workspaceId: 7, vivarcdi: { favoriteId: 'f' } }) },
    stacked: { id: 4, url: 'https://stacked.example/', vivExtData: stamped(NOW, { workspaceId: 7, group: 'stack-1' }) },
    settings: { id: 4, url: 'vivaldi://settings', vivExtData: stamped(NOW, { workspaceId: 7 }) },
  };
  for (const tab of Object.values(kept)) {
    const { tabs, sweeper } = setup([ACTIVE, { id: 2, url: 'https://same.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) }, tab]);
    await sweeper.clear();
    assert.deepEqual(tabs.removedIds(), [1, 2]);
    assert.deepEqual(creates(tabs), []);
  }
});

test('the sweep still never archives the active tab', async () => {
  const old = NOW - 100 * HOUR;
  const { tabs, sweeper } = setup([
    { ...ACTIVE, vivExtData: stamped(old, { workspaceId: 7 }) },
    { id: 2, url: 'https://stale.example/', vivExtData: stamped(old, { workspaceId: 7 }) },
  ]);
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), [2]);
  assert.deepEqual(creates(tabs), []);
});

test('clear still keeps protected tabs', async () => {
  const old = NOW - 100 * HOUR;
  const { tabs, store, sweeper } = setup([
    { ...ACTIVE, audible: true, vivExtData: stamped(old, { workspaceId: 7 }) },
    { id: 2, pinned: true, url: 'https://pinned.example/', vivExtData: stamped(old) },
    { id: 3, pinned: true, url: 'https://favorite.example/', vivExtData: JSON.stringify({ vivarcdi: { favoriteId: 'f', lastActive: old } }) },
    { id: 4, url: 'https://stacked.example/', vivExtData: stamped(old, { group: 'stack-1' }) },
    { id: 6, active: true, windowId: 2, url: 'https://other-window.example/', vivExtData: stamped(old) },
    { id: 7, url: 'vivaldi://settings', vivExtData: stamped(old) },
    { id: 8, url: 'https://other.example/', vivExtData: stamped(old, { workspaceId: 8 }) },
  ]);
  await sweeper.clear();
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(store.entries.length, 0);
  assert.deepEqual(creates(tabs), []);
});

test('clear keeps the active tab and opens no blank tab when the archive cannot be saved', async () => {
  for (const outcome of ['failed', 'memory'] as const) {
    const storage = new OutcomeStorage();
    storage.outcome = outcome;
    const { tabs, sweeper } = outcomeSetup(storage);
    await sweeper.clear();
    assert.deepEqual(tabs.removedIds(), []);
    assert.deepEqual(creates(tabs), []);
  }
});

test('sweeps once a minute until stopped', async () => {
  const { tabs, sweeper, timer } = setup([ACTIVE, { id: 2, url: 'https://old.example/', vivExtData: stamped(NOW - 13 * HOUR) }]);
  sweeper.start();
  assert.deepEqual(timer.intervals, [60_000]);
  timer.tick();
  await sweeper.sweep();
  assert.deepEqual(tabs.removedIds(), [2]);
  sweeper.stop();
  assert.equal(timer.jobs.size, 0);
});
