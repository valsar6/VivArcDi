import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HiddenTabs } from '../../../src/core/HiddenTabs.js';
import { SpaceCollapse } from '../../../src/core/SpaceCollapse.js';
import { CollapsedPinned } from '../../../src/modules/spaceheader/CollapsedPinned.js';
import { FolderTabs } from '../folders/fakes.js';
import { settle, silentLogger } from '../reopen/fakes.js';

const inWorkspace = (workspaceId: number): string => JSON.stringify({ workspaceId });

const TABS = (): FolderTabs =>
  new FolderTabs([
    { id: 1, pinned: true, discarded: false, url: 'https://loaded.example/', vivExtData: inWorkspace(7) },
    { id: 2, pinned: true, discarded: true, url: 'https://unloaded.example/', vivExtData: inWorkspace(7) },
    { id: 3, pinned: true, discarded: true, active: true, url: 'https://active.example/', vivExtData: inWorkspace(7) },
    { id: 4, pinned: true, discarded: true, url: 'https://other.example/', vivExtData: inWorkspace(8) },
    { id: 5, discarded: true, url: 'https://today.example/', vivExtData: inWorkspace(7) },
  ]);

function setup(tabs: FolderTabs): { collapse: SpaceCollapse; hidden: HiddenTabs; pinned: CollapsedPinned; hiddenIds: () => number[] } {
  const scope = {};
  const collapse = SpaceCollapse.of(scope);
  const hidden = HiddenTabs.of(scope);
  const pinned = new CollapsedPinned(tabs, { collapse, hidden, workspace: (): string => '7' }, silentLogger());
  return { collapse, hidden, pinned, hiddenIds: () => [1, 2, 3, 4, 5].filter((id) => hidden.has(id)) };
}

test('hides only unloaded pinned tabs while collapsed', async () => {
  const tabs = TABS();
  const { collapse, pinned, hiddenIds } = setup(tabs);
  await pinned.start();
  assert.deepEqual(hiddenIds(), []);

  collapse.set(true);
  await settle();
  assert.deepEqual(hiddenIds(), [2]);

  collapse.set(false);
  await settle();
  assert.deepEqual(hiddenIds(), []);

  pinned.stop();
  assert.equal(tabs.listenerCount(), 0);
});

test('shows a pinned tab that gets loaded while collapsed', async () => {
  const tabs = TABS();
  const { collapse, pinned, hiddenIds } = setup(tabs);
  await pinned.start();
  collapse.set(true);
  await settle();
  assert.deepEqual(hiddenIds(), [2]);

  const loaded = { ...tabs.tabs.get(2), discarded: false } as never;
  tabs.tabs.set(2, loaded);
  tabs.updated.forEach((listener) => listener(2, { discarded: false }, loaded));
  await settle();
  assert.deepEqual(hiddenIds(), []);

  const unloaded = { ...tabs.tabs.get(1), discarded: true } as never;
  tabs.tabs.set(1, unloaded);
  tabs.updated.forEach((listener) => listener(1, { discarded: true }, unloaded));
  await settle();
  assert.deepEqual(hiddenIds(), [1]);

  tabs.tabs.set(1, { ...tabs.tabs.get(1), active: true } as never);
  tabs.activated.forEach((listener) => listener({ tabId: 1, windowId: 1 }));
  await settle();
  assert.deepEqual(hiddenIds(), []);

  tabs.tabs.set(1, { ...tabs.tabs.get(1), active: false } as never);
  tabs.activated.forEach((listener) => listener({ tabId: 3, windowId: 1 }));
  await settle();
  assert.deepEqual(hiddenIds(), [1]);

  tabs.close(1);
  await settle();
  assert.deepEqual(hiddenIds(), []);
  pinned.stop();
});

test('shows the hidden pinned tabs again when stopped', async () => {
  const { collapse, pinned, hiddenIds } = setup(TABS());
  await pinned.start();
  collapse.set(true);
  await settle();
  assert.deepEqual(hiddenIds(), [2]);
  pinned.stop();
  assert.deepEqual(hiddenIds(), []);
});
