import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActivationRecorder } from '../../../src/modules/reopen/ActivationRecorder.js';
import { LAST_OPENED_STORAGE_KEY, LastOpenedStore } from '../../../src/modules/reopen/LastOpenedStore.js';
import { MemoryStorage, ReopenTabs, settle, silentLogger } from './fakes.js';

const now = new Date('2026-10-26T10:00:00Z');

test('records the last opened date on activation', async () => {
  const tabs = new ReopenTabs([
    { id: 1, pinned: true, url: 'https://www.mahjongsoul.game.yo-star.com/' },
    { id: 2, pinned: false, url: 'https://example.com/' },
  ]);
  const storage = new MemoryStorage();
  const store = new LastOpenedStore(storage, silentLogger());
  new ActivationRecorder(tabs, store, silentLogger(), { now: (): Date => now }).start();
  tabs.activateByUser(1);
  tabs.activateByUser(2);
  await settle();
  assert.deepEqual(store.get('mahjongsoul.game.yo-star.com'), now);
  assert.equal(store.get('example.com'), null);
  assert.deepEqual(JSON.parse(storage.getItem(LAST_OPENED_STORAGE_KEY) ?? '{}'), {
    'mahjongsoul.game.yo-star.com': now.getTime(),
  });
});

test('last opened dates survive a reload and expire after one year', () => {
  const storage = new MemoryStorage();
  const old = new Date('2025-01-01T00:00:00Z');
  storage.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify({ 'a.example': now.getTime(), 'b.example': old.getTime(), c: 'x' }));
  const store = new LastOpenedStore(storage, silentLogger());
  store.load(now);
  assert.deepEqual(store.get('a.example'), now);
  assert.equal(store.get('b.example'), null);
  assert.equal(store.get('c'), null);
});

test('last opened dates stay in memory when storage fails', () => {
  const broken = {
    getItem: (): string => '{broken',
    setItem: (): void => {
      throw new Error('quota');
    },
  };
  const store = new LastOpenedStore(broken, silentLogger());
  store.load(now);
  store.record('a.example', now);
  assert.deepEqual(store.get('a.example'), now);
});
