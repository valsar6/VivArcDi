import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActivityStamps } from '../../../src/modules/today/ActivityStamps.js';
import { ArchiveStore } from '../../../src/modules/today/ArchiveStore.js';
import { ArchiveSweeper } from '../../../src/modules/today/ArchiveSweeper.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { HOUR, ManualTimer, NOW, TodayTabs, stamped } from './fakes.js';
import type { FolderTab } from '../folders/fakes.js';

const ACTIVE: FolderTab = { id: 1, active: true, url: 'https://active.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) };

function setup(tabs: FolderTab[], clock = { now: NOW }): { tabs: TodayTabs; store: ArchiveStore; sweeper: ArchiveSweeper; stamps: ActivityStamps; timer: ManualTimer } {
  const fake = new TodayTabs(tabs);
  const store = new ArchiveStore(new MemoryStorage(), 500, silentLogger());
  const stamps = new ActivityStamps(fake, (): number => clock.now, silentLogger());
  const timer = new ManualTimer();
  const sweeper = new ArchiveSweeper({ tabs: fake, store, stamps, limitMs: 12 * HOUR, now: (): number => clock.now, repeat: timer.repeat, logger: silentLogger() });
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
  await sweeper.clear();
  assert.deepEqual(tabs.removedIds(), []);
  assert.equal(store.entries.length, 0);
});

test('does not archive the tab of a link', async () => {
  const old = NOW - 100 * HOUR;
  const linked: FolderTab = { id: 2, url: 'https://jira.example/board', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11', lastActive: old } }) };
  const { tabs, store, sweeper } = setup([ACTIVE, linked]);
  await sweeper.sweep();
  await sweeper.clear();
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

test('keeps the tabs open when the archive cannot be saved', async () => {
  const tabs = new TodayTabs([ACTIVE, { id: 2, url: 'https://old.example/', vivExtData: stamped(NOW - 13 * HOUR) }]);
  const failing = new ArchiveSweeper({
    tabs,
    store: { add: (): void => { throw new Error('quota'); } },
    stamps: { stamp: async (): Promise<void> => undefined },
    limitMs: 12 * HOUR,
    now: (): number => NOW,
    repeat: new ManualTimer().repeat,
    logger: silentLogger(),
  });
  await failing.sweep();
  assert.deepEqual(tabs.removedIds(), []);
});

test('clear archives every Today tab of the workspace except the active one', async () => {
  const { tabs, store, sweeper } = setup([
    ACTIVE,
    { id: 2, url: 'https://same.example/', vivExtData: stamped(NOW, { workspaceId: 7 }) },
    { id: 3, url: 'https://other.example/', vivExtData: stamped(NOW, { workspaceId: 8 }) },
    { id: 4, pinned: true, url: 'https://pinned.example/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  await sweeper.clear();
  assert.deepEqual(tabs.removedIds(), [2]);
  assert.deepEqual(store.entries.map(({ url }) => url), ['https://same.example/']);
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
