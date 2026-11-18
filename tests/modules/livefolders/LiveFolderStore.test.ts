import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveFolderStore, LIVE_FOLDERS_STORAGE_KEY } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';
import type { CommandItem, MenuItem } from '../../../src/core/dom/ContextMenu.js';
import { LiveFolderRefresher } from '../../../src/modules/livefolders/LiveFolderRefresher.js';
import { LiveRowMenu } from '../../../src/modules/livefolders/LiveRowMenu.js';
import { FakeGithub, HeldGithub, ManualTicker, MemoryStorage, pullRequest, recordingLogger } from './fakes.js';

const ROW = { id: '1', title: 'Fix', url: 'https://github.com/a/b/pull/1', subtitle: 'ada · a/b', updatedAt: '2026-11-01T00:00:00Z' };

const ids = (): (() => string) => {
  let next = 0;
  return () => `f${(next += 1)}`;
};

test('adds a live folder named Pull Requests with the default filters', () => {
  const store = new LiveFolderStore(new MemoryStorage(), recordingLogger().logger, ids());
  const folder = store.add('5');
  assert.equal(folder.name, 'Pull Requests');
  assert.deepEqual(folder.filters, PullRequestFilters.defaults());
  assert.deepEqual(store.folders('5').map((candidate) => candidate.id), ['f1']);
  assert.deepEqual(store.folders('6'), []);
});

test('allows several live folders in one workspace, each with its own filters', () => {
  const store = new LiveFolderStore(new MemoryStorage(), recordingLogger().logger, ids());
  store.add('5');
  store.add('5');
  store.update('f2', { filters: { ...PullRequestFilters.defaults(), drafts: false } });
  assert.deepEqual(store.folders('5').map((folder) => folder.filters.drafts), [true, false]);
});

test('keeps the rows and the warning across a restart', () => {
  const storage = new MemoryStorage();
  const first = new LiveFolderStore(storage, recordingLogger().logger, ids());
  first.add('5');
  first.update('f1', { rows: [ROW], warning: 'GitHub cannot be reached', refreshedAt: 99 });
  const second = new LiveFolderStore(storage, recordingLogger().logger, ids());
  assert.deepEqual(second.find('f1')?.rows, [ROW]);
  assert.equal(second.find('f1')?.warning, 'GitHub cannot be reached');
  assert.equal(second.find('f1')?.refreshedAt, 99);
});

test('keeps the folders of every workspace under one key, with null for no workspace', () => {
  const storage = new MemoryStorage();
  const store = new LiveFolderStore(storage, recordingLogger().logger, ids());
  store.add('5');
  store.add(null);
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem(LIVE_FOLDERS_STORAGE_KEY) ?? '{}') as object).sort(), ['', '5']);
  assert.deepEqual(new LiveFolderStore(storage, recordingLogger().logger).workspaces.sort(), ['5', null]);
});

test('removes a folder with its filters and rows', () => {
  const storage = new MemoryStorage();
  const store = new LiveFolderStore(storage, recordingLogger().logger, ids());
  store.add('5');
  store.add('5');
  store.remove('f1');
  assert.deepEqual(store.all().map((folder) => folder.id), ['f2']);
  store.remove('f2');
  assert.deepEqual(store.workspaces, []);
  assert.equal(storage.getItem(LIVE_FOLDERS_STORAGE_KEY), '{}');
});

test('starts empty when the stored text is damaged', () => {
  const storage = new MemoryStorage();
  storage.setItem(LIVE_FOLDERS_STORAGE_KEY, '{not json');
  const { logger, sink } = recordingLogger();
  assert.deepEqual(new LiveFolderStore(storage, logger).all(), []);
  assert.equal(sink.lines.length, 1);
  storage.setItem(LIVE_FOLDERS_STORAGE_KEY, JSON.stringify({ 5: [{ id: 'x', name: 'Mine', rows: [{ id: 3 }, ROW], filters: 'bad' }, 'junk'] }));
  const [folder] = new LiveFolderStore(storage, logger).all();
  assert.deepEqual([folder?.name, folder?.rows, folder?.filters], ['Mine', [ROW], PullRequestFilters.defaults()]);
});

test('says whether the folder to change exists', () => {
  const store = new LiveFolderStore(new MemoryStorage(), recordingLogger().logger, ids());
  assert.equal(store.update('nope', { name: 'x' }), false);
});

const windowsOn = (storage: MemoryStorage): [LiveFolderStore, LiveFolderStore] => {
  let next = 100;
  return [new LiveFolderStore(storage, recordingLogger().logger, ids()), new LiveFolderStore(storage, recordingLogger().logger, () => `g${(next += 1)}`)];
};

const savedIds = (storage: MemoryStorage): Record<string, string[]> => {
  const saved = JSON.parse(storage.getItem(LIVE_FOLDERS_STORAGE_KEY) ?? '{}') as Record<string, Array<{ id: string }>>;
  return Object.fromEntries(Object.entries(saved).map(([key, folders]) => [key, folders.map((folder) => folder.id)]));
};

test('reads the live folders saved by another window', () => {
  const [first, second] = windowsOn(new MemoryStorage());
  assert.deepEqual(first.all(), []);
  second.add('5');
  second.update('g101', { name: 'Mine' });
  assert.deepEqual(first.all().map((folder) => folder.name), ['Mine']);
  assert.equal(first.find('g101')?.name, 'Mine');
  assert.deepEqual(first.workspaces, ['5']);
  assert.deepEqual(first.folders('5').map((folder) => folder.id), ['g101']);
});

test('adds a folder without dropping the folders of another window', () => {
  const storage = new MemoryStorage();
  const [first, second] = windowsOn(storage);
  first.add('5');
  second.add('5');
  first.add('6');
  second.add('6');
  assert.deepEqual(savedIds(storage), { 5: ['f1', 'g101'], 6: ['f2', 'g102'] });
});

test('changes only the given fields of a folder', () => {
  const storage = new MemoryStorage();
  const [first, second] = windowsOn(storage);
  first.add('5');
  first.add('5');
  second.update('f1', { name: 'Renamed' });
  first.update('f1', { rows: [ROW], refreshedAt: 7 });
  const [changed, other] = second.folders('5');
  assert.deepEqual([changed?.name, changed?.rows, changed?.refreshedAt, changed?.filters], ['Renamed', [ROW], 7, PullRequestFilters.defaults()]);
  assert.deepEqual([other?.id, other?.name, other?.rows], ['f2', 'Pull Requests', []]);
});

test('does not bring back a folder deleted in another window', async () => {
  const storage = new MemoryStorage();
  const [first, second] = windowsOn(storage);
  first.add('5');
  first.add('5');
  assert.equal(first.find('f1')?.id, 'f1');
  second.remove('f1');
  const writes = storage.writes.length;
  assert.equal(first.update('f1', { name: 'Back' }), false);
  first.remove('f1');
  assert.equal(storage.writes.length, writes);
  assert.equal(first.find('f1'), undefined);
  assert.deepEqual(savedIds(storage), { 5: ['f2'] });
  first.update('f2', { rows: [ROW] });
  const held = new HeldGithub(new FakeGithub([pullRequest(1)]));
  const refresher = new LiveFolderRefresher({ store: first, github: held, connection: { token: 'secret' }, changed: (): void => undefined, ticker: new ManualTicker(), intervalMs: 1, logger: recordingLogger().logger });
  let opened: MenuItem[] = [];
  const menu = new LiveRowMenu({
    menu: { open: (items): void => void (opened = items) },
    store: first,
    copier: { write: async (): Promise<void> => undefined },
    toast: (): void => undefined,
    changed: (): void => undefined,
  });
  menu.open('live:f2:1', 0, 0);
  held.hold();
  refresher.refresh('f2');
  second.remove('f2');
  const writesBefore = storage.writes.length;
  held.release();
  await refresher.idle();
  (opened.find((item) => item.label === 'Archive Pull Request') as CommandItem).run();
  assert.equal(storage.writes.length, writesBefore);
  assert.deepEqual([first.find('f2'), savedIds(storage)], [undefined, {}]);
});

test('removes only the given folder', () => {
  const storage = new MemoryStorage();
  const [first, second] = windowsOn(storage);
  first.add('5');
  second.add('5');
  first.add('6');
  first.remove('f2');
  assert.deepEqual(savedIds(storage), { 5: ['f1', 'g101'] });
  second.remove('f1');
  assert.deepEqual(savedIds(storage), { 5: ['g101'] });
  second.remove('g101');
  assert.deepEqual(savedIds(storage), {});
});

test('warns once when the saved live folders are damaged', () => {
  const storage = new MemoryStorage();
  storage.setItem(LIVE_FOLDERS_STORAGE_KEY, '{not json');
  const { logger, sink } = recordingLogger();
  const store = new LiveFolderStore(storage, logger, ids());
  assert.deepEqual([store.all(), store.find('x'), store.workspaces, store.folders('5')], [[], undefined, [], []]);
  store.add('5');
  assert.equal(sink.lines.length, 1);
  assert.deepEqual(savedIds(storage), { 5: ['f1'] });
});
