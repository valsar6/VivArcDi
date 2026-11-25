import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActiveWorkspace } from '../../../src/core/workspaces/ActiveWorkspace.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { silentLogger, settle } from '../../modules/reopen/fakes.js';
import { FolderTabs } from '../../modules/folders/fakes.js';

const inWorkspace = (workspaceId: number): string => JSON.stringify({ workspaceId });

function switchTo(tabs: FolderTabs, tabId: number): void {
  tabs.tabs.forEach((tab, id) => tabs.tabs.set(id, { ...tab, active: id === tabId }));
  tabs.activated.forEach((listener) => listener({ tabId, windowId: 1 }));
}

function warningLogger(warnings: unknown[][]): Logger {
  return new Logger('test', {
    info: (): void => undefined,
    error: (): void => undefined,
    warn: (...message: unknown[]): void => void warnings.push(message),
  });
}

interface Setup {
  tabs: FolderTabs;
  seen: Array<string | null>;
  active: ActiveWorkspace;
}

function setup({ listed = (): boolean => true, logger = silentLogger() }: { listed?: (workspaceId: string) => boolean; logger?: Logger } = {}): Setup {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://a.example/', vivExtData: inWorkspace(7) },
    { id: 2, url: 'https://b.example/', vivExtData: inWorkspace(8) },
    { id: 3, url: 'https://c.example/' },
  ]);
  const seen: Array<string | null> = [];
  const active = new ActiveWorkspace(tabs, logger, listed);
  active.onChange((workspace): void => void seen.push(workspace));
  return { tabs, seen, active };
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

test('keeps the selected workspace when an internal tab becomes active', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  tabs.tabs.set(4, { id: 4, windowId: 1, url: 'vivaldi://inspect/#apps', vivExtData: inWorkspace(9) });
  switchTo(tabs, 4);
  await settle();
  assert.deepEqual(seen, [], 'an inspection page is not a change');
  assert.equal(active.current, '7');

  tabs.tabs.set(5, { id: 5, windowId: 1, url: 'devtools://devtools/bundled/inspector.html?ws=127.0.0.1:9222', vivExtData: inWorkspace(9) });
  switchTo(tabs, 5);
  await settle();
  assert.deepEqual(seen, [], 'a DevTools window is not a change');
  assert.equal(active.current, '7');
  active.stop();
});

test('selects the Tabs area for a tab outside any workspace', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  assert.equal(active.current, '7');
  switchTo(tabs, 3);
  await settle();
  assert.deepEqual(seen, [null]);
  assert.equal(active.current, null);
  active.stop();
});

test('keeps the last workspace when the active tab is removed', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  assert.equal(active.current, '7');
  tabs.tabs.set(1, { ...tabs.tabs.get(1), active: false } as never);
  tabs.close(1);
  await settle();
  assert.deepEqual(seen, []);
  assert.equal(active.current, '7');
  active.stop();
});

test('keeps the shown workspace during a hold and follows the next activation after it', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  active.hold();
  switchTo(tabs, 3);
  await settle();
  assert.deepEqual(seen, [], 'an activation during the hold is consumed');
  assert.equal(active.current, '7');

  active.release();
  switchTo(tabs, 2);
  await settle();
  assert.deepEqual(seen, ['8'], 'a later activation is honoured');
  assert.equal(active.current, '8');
  active.stop();
});

test('drops a read that lands after a hold starts', async () => {
  const { tabs, seen, active } = setup();
  await active.start();
  switchTo(tabs, 2);
  active.hold();
  await settle();
  assert.deepEqual(seen, []);
  assert.equal(active.current, '7');
  active.release();
  active.stop();
});

test('keeps the last workspace when the tab names a workspace Vivaldi does not list', async () => {
  const warnings: unknown[][] = [];
  const { tabs, seen, active } = setup({ listed: (id): boolean => id === '7' || id === '8', logger: warningLogger(warnings) });
  await active.start();
  switchTo(tabs, 2);
  await settle();
  assert.equal(active.current, '8');

  const moved = { ...tabs.tabs.get(2), vivExtData: inWorkspace(99) } as never;
  tabs.tabs.set(2, moved);
  tabs.updated.forEach((listener) => listener(2, { vivExtData: inWorkspace(99) } as never, moved));
  await settle();
  assert.deepEqual(seen, ['8']);
  assert.equal(active.current, '8');
  assert.equal(warnings.length, 1);
  active.stop();
});
