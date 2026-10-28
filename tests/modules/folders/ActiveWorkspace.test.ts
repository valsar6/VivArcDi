import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActiveWorkspace } from '../../../src/modules/folders/ActiveWorkspace.js';
import { silentLogger, settle } from '../reopen/fakes.js';
import { FolderTabs } from './fakes.js';

const inWorkspace = (workspaceId: number): string => JSON.stringify({ workspaceId });

function switchTo(tabs: FolderTabs, tabId: number): void {
  tabs.tabs.forEach((tab, id) => tabs.tabs.set(id, { ...tab, active: id === tabId }));
  tabs.activated.forEach((listener) => listener({ tabId, windowId: 1 }));
}

function setup(): { tabs: FolderTabs; seen: Array<string | null>; active: ActiveWorkspace } {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://a.example/', vivExtData: inWorkspace(7) },
    { id: 2, url: 'https://b.example/', vivExtData: inWorkspace(8) },
    { id: 3, url: 'https://c.example/' },
  ]);
  const seen: Array<string | null> = [];
  return { tabs, seen, active: new ActiveWorkspace(tabs, (workspace) => void seen.push(workspace), silentLogger()) };
}

test('reports the workspace of the active tab when it changes', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  assert.equal(active.current, '7');
  assert.deepEqual(seen, [], 'the first read is not a change');

  switchTo(tabs, 2);
  await settle();
  switchTo(tabs, 2);
  await settle();
  switchTo(tabs, 3);
  await settle();
  assert.deepEqual(seen, ['8', null]);
  assert.equal(active.current, null);
  active.stop();
  assert.equal(tabs.listenerCount(), 0);
});

test('reports a tab moved to another workspace', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  const moved = { ...tabs.tabs.get(1), vivExtData: inWorkspace(8) } as never;
  tabs.tabs.set(1, moved);
  tabs.updated.forEach((listener) => listener(1, { vivExtData: inWorkspace(8) } as never, moved));
  await settle();
  assert.deepEqual(seen, ['8']);
  active.stop();
});

test('keeps the last workspace while no tab is active', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  tabs.tabs.set(1, { ...tabs.tabs.get(1), active: false } as never);
  tabs.activated.forEach((listener) => listener({ tabId: 1, windowId: 1 }));
  await settle();
  assert.deepEqual(seen, []);
  assert.equal(active.current, '7');
  active.stop();
});
