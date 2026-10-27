import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PersistentStorage } from '../../src/core/PersistentStorage.js';
import type { StorageArea, StorageHost } from '../../src/core/PersistentStorage.js';
import { silentLogger } from '../modules/reopen/fakes.js';
import { DomDocument, asDocument } from './dom.js';

class FakeArea implements StorageArea {
  public items: Record<string, unknown>;
  public writes: Array<Record<string, unknown>> = [];
  public failing = false;
  public host: StorageHost = { runtime: {} };

  constructor(items: Record<string, unknown> = {}) {
    this.items = items;
  }

  public get(_keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void {
    this.host.runtime = { lastError: this.failing ? { message: 'denied' } : undefined };
    callback(this.items);
  }

  public set(items: Record<string, unknown>, callback?: () => void): void {
    this.writes.push(items);
    Object.assign(this.items, items);
    callback?.();
  }
}

const hostOf = (area: FakeArea): StorageHost => {
  area.host = { storage: { local: area }, runtime: {} };
  return area.host;
};

test('uses localStorage when the window has a working one', async () => {
  const dom = new DomDocument();
  const items = new Map<string, string>();
  dom.defaultView = { localStorage: { getItem: (key): string | null => items.get(key) ?? null, setItem: (key, value): void => void items.set(key, value), removeItem: (key): void => void items.delete(key) } };
  const storage = await PersistentStorage.open(asDocument(dom), undefined, silentLogger());
  storage.setItem('vivarcdi.a', '1');
  assert.equal(items.get('vivarcdi.a'), '1');
});

test('falls back to chrome.storage.local when localStorage is null', async () => {
  const dom = new DomDocument();
  dom.defaultView = { localStorage: null };
  const area = new FakeArea({ 'vivarcdi.lastOpened': '{"a":1}', other: 'x', 'vivarcdi.number': 5 });
  const storage = await PersistentStorage.open(asDocument(dom), hostOf(area), silentLogger());
  assert.equal(storage.getItem('vivarcdi.lastOpened'), '{"a":1}');
  assert.equal(storage.getItem('other'), null);
  assert.equal(storage.getItem('vivarcdi.number'), null);
  storage.setItem('vivarcdi.openFolders', '["1"]');
  assert.equal(storage.getItem('vivarcdi.openFolders'), '["1"]');
  assert.deepEqual(area.writes, [{ 'vivarcdi.openFolders': '["1"]' }]);

  const restarted = await PersistentStorage.open(asDocument(dom), hostOf(area), silentLogger());
  assert.equal(restarted.getItem('vivarcdi.openFolders'), '["1"]');
});

test('keeps values in memory when there is no storage or it cannot be read', async () => {
  const dom = new DomDocument();
  dom.defaultView = { localStorage: null };
  const none = await PersistentStorage.open(asDocument(dom), undefined, silentLogger());
  none.setItem('vivarcdi.a', '1');
  assert.equal(none.getItem('vivarcdi.a'), '1');

  const area = new FakeArea();
  area.failing = true;
  const denied = await PersistentStorage.open(asDocument(dom), hostOf(area), silentLogger());
  denied.setItem('vivarcdi.b', '2');
  assert.equal(denied.getItem('vivarcdi.b'), '2');
  assert.deepEqual(area.writes, []);
});

test('keeps the value in memory when a write fails', async () => {
  const dom = new DomDocument();
  dom.defaultView = null;
  const area = new FakeArea();
  const host = hostOf(area);
  const storage = await PersistentStorage.open(asDocument(dom), host, silentLogger());
  area.set = (): void => {
    throw new Error('quota');
  };
  storage.setItem('vivarcdi.c', '3');
  assert.equal(storage.getItem('vivarcdi.c'), '3');
});
