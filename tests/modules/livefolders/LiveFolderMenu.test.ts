import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CommandItem, MenuItem, SubmenuItem } from '../../../src/core/dom/ContextMenu.js';
import { LiveFolderMenu } from '../../../src/modules/livefolders/LiveFolderMenu.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';
import { MemoryStorage, recordingLogger } from './fakes.js';

interface Setup {
  storage: MemoryStorage;
  store: LiveFolderStore;
  menu: LiveFolderMenu;
  opened: Array<{ items: MenuItem[]; x: number; y: number }>;
  refreshed: string[];
  removed: string[];
  disconnected: string[];
  editors: Array<{ x: number; y: number; repositories: string[]; save: (repositories: string[]) => void }>;
}

function setup(anchor: { x: number; y: number } | null = null, connected = true): Setup {
  const storage = new MemoryStorage();
  const store = new LiveFolderStore(storage, recordingLogger().logger, () => 'f1');
  store.add('5');
  const opened: Setup['opened'] = [];
  const refreshed: string[] = [];
  const removed: string[] = [];
  const editors: Setup['editors'] = [];
  const disconnected: string[] = [];
  const menu = new LiveFolderMenu({
    menu: { open: (items, x, y): void => void opened.push({ items, x, y }) },
    editor: { open: (x, y, repositories, save): void => void editors.push({ x, y, repositories, save }) },
    store,
    refresh: (folderId): void => void refreshed.push(folderId),
    remove: (folderId): void => void removed.push(folderId),
    connected: (): boolean => connected,
    disconnect: (): void => void disconnected.push('github'),
    anchor: (): { x: number; y: number } | null => anchor,
  });
  return { storage, store, menu, opened, refreshed, removed, editors, disconnected };
}

const submenu = (items: MenuItem[], label: string): MenuItem[] => (items.find((item) => item.label === label) as SubmenuItem).items;
const command = (items: MenuItem[], label: string): CommandItem => items.find((item) => item.label === label) as CommandItem;

test('opens a menu with the filters, Refresh, Disconnect GitHub and Delete Live Folder', () => {
  const context = setup();
  context.menu.open('live:f1', 10, 20);
  const [menu] = context.opened;
  assert.deepEqual([menu?.x, menu?.y], [10, 20]);
  assert.deepEqual(menu?.items.map((item) => item.label), ['Pull Requests', 'Refresh', 'Disconnect GitHub', 'Delete Live Folder']);
  const filters = submenu(menu?.items ?? [], 'Pull Requests');
  assert.deepEqual(filters.map((item) => item.label), ['Created By Me', 'Review Requests', 'Drafts', 'Repositories…']);
  assert.deepEqual(filters.slice(0, 3).map((item) => (item as CommandItem).checked), [true, true, true]);
  assert.equal((filters[3] as CommandItem).checked, undefined);
});

test('offers Disconnect GitHub only while GitHub is connected, and forgets the connection with it', () => {
  const connected = setup();
  connected.menu.open('live:f1', 0, 0);
  command(connected.opened[0]?.items ?? [], 'Disconnect GitHub').run();
  assert.deepEqual(connected.disconnected, ['github']);
  const apart = setup(null, false);
  apart.menu.open('live:f1', 0, 0);
  assert.deepEqual(apart.opened[0]?.items.map((item) => item.label), ['Pull Requests', 'Refresh', 'Delete Live Folder']);
});

test('stores the filters of a live folder', () => {
  const context = setup();
  context.menu.open('live:f1', 0, 0);
  command(submenu(context.opened[0]?.items ?? [], 'Pull Requests'), 'Drafts').run();
  assert.equal(context.store.find('f1')?.filters.drafts, false);
  assert.deepEqual(context.refreshed, ['f1']);
  const restarted = new LiveFolderStore(context.storage, recordingLogger().logger);
  assert.deepEqual(restarted.find('f1')?.filters, { ...PullRequestFilters.defaults(), drafts: false });
  context.menu.open('live:f1', 0, 0);
  const [, second] = context.opened;
  assert.deepEqual(submenu(second?.items ?? [], 'Pull Requests').slice(0, 3).map((item) => (item as CommandItem).checked), [true, true, false]);
});

test('flips a filter back when it is chosen again', () => {
  const context = setup();
  context.menu.open('live:f1', 0, 0);
  const created = command(submenu(context.opened[0]?.items ?? [], 'Pull Requests'), 'Created By Me');
  created.run();
  created.run();
  assert.equal(context.store.find('f1')?.filters.createdByMe, true);
});

test('stores the repositories the user types and refreshes', () => {
  const context = setup({ x: 3, y: 44 });
  context.menu.open('live:f1', 10, 20);
  command(submenu(context.opened[0]?.items ?? [], 'Pull Requests'), 'Repositories…').run();
  const [editor] = context.editors;
  assert.deepEqual([editor?.x, editor?.y, editor?.repositories], [3, 44, []]);
  editor?.save(['acme/web']);
  assert.deepEqual(context.store.find('f1')?.filters.repositories, ['acme/web']);
  assert.deepEqual(context.refreshed, ['f1']);
});

test('opens the repositories field at the pointer when the row is not found', () => {
  const context = setup();
  context.menu.open('live:f1', 10, 20);
  command(submenu(context.opened[0]?.items ?? [], 'Pull Requests'), 'Repositories…').run();
  assert.deepEqual([context.editors[0]?.x, context.editors[0]?.y], [10, 20]);
});

test('refreshes and deletes the folder it was opened for', () => {
  const context = setup();
  context.menu.open('live:f1', 0, 0);
  const items = context.opened[0]?.items ?? [];
  command(items, 'Refresh').run();
  command(items, 'Delete Live Folder').run();
  assert.deepEqual(context.refreshed, ['f1']);
  assert.deepEqual(context.removed, ['f1']);
});

test('opens nothing for an id that is not a live folder', () => {
  const context = setup();
  context.menu.open('42', 0, 0);
  context.menu.open('live:gone', 0, 0);
  assert.equal(context.opened.length, 0);
});
