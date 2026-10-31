import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserTabs } from '../../../src/core/BrowserTabs.js';
import { PrivateTabs } from '../../../src/modules/incognito/PrivateTabs.js';
import { FolderTabs } from '../folders/fakes.js';
import { runtimeOf } from './fakes.js';

const TABS = (): FolderTabs =>
  new FolderTabs([
    { id: 1, windowId: 5, active: false },
    { id: 2, windowId: 5, active: true },
    { id: 3, windowId: 5, active: false },
    { id: 4, windowId: 8, active: false },
    { id: 5, windowId: 8, active: true },
  ]);

const privateTabs = (tabs: FolderTabs): PrivateTabs => new PrivateTabs(tabs as unknown as BrowserTabs, runtimeOf(5));

test('clear closes all private tabs but the active one', async () => {
  const tabs = TABS();
  await privateTabs(tabs).clear();
  assert.deepEqual([...tabs.tabs.keys()], [2, 4, 5]);
});

test('clear archives nothing', async () => {
  const tabs = TABS();
  await privateTabs(tabs).clear();
  assert.deepEqual(tabs.calls.map(([name]) => name), ['remove', 'remove']);
});

test('clear leaves the tabs alone when the window has no active tab', async () => {
  const tabs = new FolderTabs([{ id: 1, windowId: 5, active: false }]);
  await privateTabs(tabs).clear();
  assert.deepEqual(tabs.calls, []);
});
