import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import { ARCHIVE_STORAGE_KEY, ArchiveStore } from '../../../src/modules/today/ArchiveStore.js';
import { SilentSink } from '../../loader/fakes.js';
import { MemoryStorage, silentLogger } from '../reopen/fakes.js';
import { NOW, entry } from './fakes.js';

test('drops the oldest entries past the limit', () => {
  const storage = new MemoryStorage();
  const store = new ArchiveStore(storage, 50, silentLogger());
  store.load();
  store.add(Array.from({ length: 49 }, (_, index) => entry(`https://site.example/${index}`, `Page ${index}`, NOW + index)));
  store.add([entry('https://a.example/', 'A', NOW + 100), entry('https://b.example/', 'B', NOW + 101)]);
  assert.equal(store.entries.length, 50);
  assert.equal(store.entries[0]?.url, 'https://b.example/');
  assert.ok(!store.entries.some(({ url }) => url === 'https://site.example/0'));
  const reloaded = new ArchiveStore(storage, 50, silentLogger());
  reloaded.load();
  assert.deepEqual(reloaded.entries, store.entries);
});

test('skips malformed entries and warns once', () => {
  const storage = new MemoryStorage();
  storage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([entry('https://ok.example/', 'Ok', NOW), { url: 3 }, null, { ...entry('https://x.example/', 'X', NOW), archivedAt: 'yesterday' }]));
  const sink = new SilentSink();
  const store = new ArchiveStore(storage, 500, new Logger('test', sink));
  store.load();
  assert.deepEqual(store.entries.map(({ url }) => url), ['https://ok.example/']);
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});

test('removes a restored entry and saves the archive', () => {
  const storage = new MemoryStorage();
  const store = new ArchiveStore(storage, 500, silentLogger());
  store.add([entry('https://a.example/', 'A', NOW), entry('https://b.example/', 'B', NOW - 1)]);
  const [first] = store.entries;
  assert.ok(first);
  store.remove(first);
  assert.deepEqual(JSON.parse(storage.getItem(ARCHIVE_STORAGE_KEY) ?? '[]'), [entry('https://b.example/', 'B', NOW - 1)]);
});

test('adds nothing when the archive cannot be saved', () => {
  const store = new ArchiveStore({ getItem: (): null => null, setItem: (): never => { throw new Error('quota'); } }, 500, silentLogger());
  assert.throws(() => store.add([entry('https://a.example/', 'A', NOW)]), /quota/);
  assert.equal(store.entries.length, 0);
});

test('keeps entries another window added', () => {
  const storage = new MemoryStorage();
  const first = new ArchiveStore(storage, 500, silentLogger());
  const second = new ArchiveStore(storage, 500, silentLogger());
  first.load();
  second.load();
  first.add([entry('https://a.example/', 'A', NOW)]);
  second.add([entry('https://b.example/', 'B', NOW + 1)]);
  assert.deepEqual(first.entries.map(({ url }) => url), ['https://b.example/', 'https://a.example/']);
  assert.equal((JSON.parse(storage.getItem(ARCHIVE_STORAGE_KEY) ?? '[]') as unknown[]).length, 2);
});

test('removes an entry by value after another window changed the archive', () => {
  const storage = new MemoryStorage();
  const first = new ArchiveStore(storage, 500, silentLogger());
  const second = new ArchiveStore(storage, 500, silentLogger());
  first.add([entry('https://a.example/', 'A', NOW), entry('https://b.example/', 'B', NOW - 1)]);
  const [target] = first.entries;
  assert.ok(target);
  second.add([entry('https://c.example/', 'C', NOW + 5)]);
  first.remove({ ...target });
  assert.deepEqual(second.entries.map(({ url }) => url), ['https://c.example/', 'https://b.example/']);
});
