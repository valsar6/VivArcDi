import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveFolderStore, LIVE_FOLDERS_STORAGE_KEY } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';
import { MemoryStorage, recordingLogger } from './fakes.js';

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

test('restores the last rows at startup', () => {
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
