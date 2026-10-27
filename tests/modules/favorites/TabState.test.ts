import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabUnloader } from '../../../src/core/TabUnloader.js';
import { UnloadedTabs } from '../../../src/modules/favorites/UnloadedTabs.js';
import { FakeTabs } from './fakes.js';

test('UnloadedTabs reads the pinned tabs that are already unloaded', async () => {
  const tabs = new FakeTabs([
    { id: 1, pinned: true, discarded: true },
    { id: 2, pinned: true, status: 'unloaded' },
    { id: 3, pinned: true, status: 'complete' },
  ]);
  let changes = 0;
  const unloaded = new UnloadedTabs(tabs, () => (changes += 1));
  await unloaded.start();
  assert.deepEqual([1, 2, 3].map((id) => unloaded.has(id)), [true, true, false]);
  assert.equal(changes, 1);
});

test('UnloadedTabs follows discard and reload updates', async () => {
  const tabs = new FakeTabs([{ id: 1, pinned: true, status: 'complete' }]);
  let changes = 0;
  const unloaded = new UnloadedTabs(tabs, () => (changes += 1));
  await unloaded.start();
  tabs.emit(1, { discarded: true });
  assert.ok(unloaded.has(1));
  tabs.emit(1, { title: 'Inbox (3)' });
  tabs.emit(1, { discarded: false, status: 'loading' });
  assert.equal(unloaded.has(1), false);
  assert.equal(changes, 3);
});

test('UnloadedTabs stops listening on stop', async () => {
  const tabs = new FakeTabs([{ id: 1, pinned: true }]);
  const unloaded = new UnloadedTabs(tabs, () => {});
  await unloaded.start();
  unloaded.stop();
  assert.equal(tabs.listeners.size, 0);
});

test('an inactive tile is unloaded in place', async () => {
  const tabs = new FakeTabs([{ id: 1, windowId: 9, active: false }]);
  assert.equal(await new TabUnloader(tabs).unload(1), true);
  assert.deepEqual(tabs.calls, [['discard', 1]]);
});

test('an active tile hands focus to the most recently used tab first', async () => {
  const tabs = new FakeTabs([
    { id: 1, windowId: 9, index: 0, active: true, lastAccessed: 300 },
    { id: 2, windowId: 9, index: 1, lastAccessed: 100 },
    { id: 3, windowId: 9, index: 2, lastAccessed: 200 },
    { id: 4, windowId: 9, index: 3, lastAccessed: 250, discarded: true },
  ]);
  await new TabUnloader(tabs).unload(1);
  assert.deepEqual(tabs.calls.slice(1), [['activate', 3], ['discard', 1]]);
});

test('the only tab of a window is not unloaded', async () => {
  const tabs = new FakeTabs([{ id: 1, windowId: 9, index: 0, active: true }]);
  assert.equal(await new TabUnloader(tabs).unload(1), false);
  assert.deepEqual(tabs.calls.map(([name]) => name), ['query']);
});

test('without access times the nearest tab is chosen', () => {
  const leaving = { id: 5, index: 4 } as chrome.tabs.Tab;
  const windowTabs = [
    leaving,
    { id: 1, index: 0 },
    { id: 6, index: 5 },
    { id: 7, index: 6 },
  ] as chrome.tabs.Tab[];
  assert.equal(TabUnloader.successorOf(windowTabs, leaving)?.id, 6);
});
