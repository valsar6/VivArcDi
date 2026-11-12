import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CommandItem, MenuItem } from '../../../src/core/dom/ContextMenu.js';
import { LiveRowMenu } from '../../../src/modules/livefolders/LiveRowMenu.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { MemoryStorage, recordingLogger } from './fakes.js';
import { settle } from '../reopen/fakes.js';

const ROWS = [
  { id: '7', title: 'Fix', url: 'https://github.com/acme/web/pull/7', subtitle: 'ada · acme/web', updatedAt: '2026-11-07T10:00:00Z' },
  { id: '8', title: 'Add', url: 'https://github.com/acme/web/pull/8', subtitle: 'ada · acme/web', updatedAt: '2026-11-08T10:00:00Z' },
];

function setup(copyFails = false): { store: LiveFolderStore; menu: LiveRowMenu; opened: Array<{ items: MenuItem[]; x: number; y: number }>; copied: string[]; toasts: string[]; changes: () => number } {
  const store = new LiveFolderStore(new MemoryStorage(), recordingLogger().logger, () => 'f1');
  store.add('5');
  store.update('f1', { rows: ROWS });
  const opened: Array<{ items: MenuItem[]; x: number; y: number }> = [];
  const copied: string[] = [];
  const toasts: string[] = [];
  let changes = 0;
  const menu = new LiveRowMenu({
    menu: { open: (items, x, y): void => void opened.push({ items, x, y }) },
    store,
    copier: { write: async (text): Promise<void> => (copyFails ? Promise.reject(new Error('refused')) : void copied.push(text)) },
    toast: (text): void => void toasts.push(text),
    changed: (): void => void (changes += 1),
  });
  return { store, menu, opened, copied, toasts, changes: (): number => changes };
}

const command = (items: MenuItem[], label: string): CommandItem => items.find((item) => item.label === label) as CommandItem;

test('offers Copy Link and Archive Pull Request at the pointer', () => {
  const { menu, opened } = setup();
  menu.open('live:f1:7', 4, 9);
  assert.deepEqual(opened.map((entry) => [entry.x, entry.y, entry.items.map((item) => item.label)]), [[4, 9, ['Copy Link', 'Archive Pull Request']]]);
});

test('copies the address of the pull request and says Copied', async () => {
  const { menu, opened, copied, toasts } = setup();
  menu.open('live:f1:8', 0, 0);
  command(opened[0]?.items ?? [], 'Copy Link').run();
  await settle();
  assert.deepEqual(copied, ['https://github.com/acme/web/pull/8']);
  assert.deepEqual(toasts, ['Copied']);
});

test('says so when the copy is refused', async () => {
  const { menu, opened, toasts } = setup(true);
  menu.open('live:f1:8', 0, 0);
  command(opened[0]?.items ?? [], 'Copy Link').run();
  await settle();
  assert.deepEqual(toasts, ['Copy failed']);
});

test('archives a pull request: the row goes and its update time is remembered', () => {
  const { store, menu, opened, changes } = setup();
  menu.open('live:f1:7', 0, 0);
  command(opened[0]?.items ?? [], 'Archive Pull Request').run();
  assert.deepEqual(store.find('f1')?.rows.map((row) => row.id), ['8']);
  assert.deepEqual(store.find('f1')?.archived, { '7': '2026-11-07T10:00:00Z' });
  assert.equal(changes(), 1);
});

test('opens nothing for a row that is not there', () => {
  const { menu, opened } = setup();
  menu.open('live:f1:99', 0, 0);
  menu.open('live:nope:7', 0, 0);
  menu.open('somebookmark', 0, 0);
  assert.deepEqual(opened, []);
});
