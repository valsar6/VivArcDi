import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PersistentStorage } from '../../../src/core/browser/PersistentStorage.js';
import type { StorageArea, StorageChangeListener, StorageHost } from '../../../src/core/browser/PersistentStorage.js';
import { silentLogger } from '../../modules/reopen/fakes.js';
import { DomDocument, asDocument } from '../dom.js';

class FakeArea implements StorageArea {
  public items: Record<string, unknown>;
  public writes: Array<Record<string, unknown>> = [];
  public failing = false;
  public host: StorageHost = { runtime: {} };
  public listeners: StorageChangeListener[] = [];

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
  area.host = { storage: { local: area, onChanged: { addListener: (listener): void => void area.listeners.push(listener), removeListener: (listener): void => void (area.listeners = area.listeners.filter((candidate) => candidate !== listener)) } }, runtime: {} };
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

const openOnArea = async (area: FakeArea, host: StorageHost = hostOf(area)): Promise<Awaited<ReturnType<typeof PersistentStorage.open>>> => {
  const dom = new DomDocument();
  dom.defaultView = null;
  return PersistentStorage.open(asDocument(dom), host, silentLogger());
};

test('follows changes another window makes to chrome.storage.local', async () => {
  const area = new FakeArea({ 'vivarcdi.a': '1', 'vivarcdi.b': '2' });
  const storage = await openOnArea(area);
  assert.equal(area.listeners.length, 1);
  area.listeners[0]?.({ 'vivarcdi.a': { newValue: '10' }, 'vivarcdi.c': { newValue: '3' }, 'vivarcdi.b': { newValue: undefined } }, 'local');
  assert.equal(storage.getItem('vivarcdi.a'), '10');
  assert.equal(storage.getItem('vivarcdi.c'), '3');
  assert.equal(storage.getItem('vivarcdi.b'), null);
});

test('ignores changes in other areas and to keys that are not VivArcDi\'s', async () => {
  const area = new FakeArea({ 'vivarcdi.a': '1' });
  const storage = await openOnArea(area);
  area.listeners[0]?.({ 'vivarcdi.a': { newValue: 'sync' } }, 'sync');
  area.listeners[0]?.({ other: { newValue: 'x' }, 'vivarcdi.a': { newValue: 5 } }, 'local');
  assert.equal(storage.getItem('vivarcdi.a'), '1');
  assert.equal(storage.getItem('other'), null);
});

test('works when chrome.storage has no onChanged', async () => {
  const area = new FakeArea({ 'vivarcdi.a': '1' });
  const storage = await openOnArea(area, { storage: { local: area }, runtime: {} });
  storage.setItem('vivarcdi.a', '2');
  assert.equal(storage.getItem('vivarcdi.a'), '2');
});

const openWithoutLocal = (host: StorageHost | undefined): Promise<Awaited<ReturnType<typeof PersistentStorage.open>>> => {
  const dom = new DomDocument();
  dom.defaultView = { localStorage: null };
  return PersistentStorage.open(asDocument(dom), host, silentLogger());
};

const localDocument = (items: Map<string, string>, isFull: () => boolean = (): boolean => false): DomDocument => {
  const dom = new DomDocument();
  dom.defaultView = {
    localStorage: {
      getItem: (key): string | null => items.get(key) ?? null,
      setItem: (key, value): void => {
        if (isFull()) {
          throw new Error('quota');
        }
        items.set(key, value);
      },
      removeItem: (key): void => void items.delete(key),
    },
  };
  return dom;
};

test('reports whether it saves to disk', async () => {
  const local = await PersistentStorage.open(asDocument(localDocument(new Map())), undefined, silentLogger());
  assert.equal(local.mode, 'persistent');
  assert.equal((await openWithoutLocal(hostOf(new FakeArea()))).mode, 'persistent');
  assert.equal((await openWithoutLocal(undefined)).mode, 'memory');
  const denied = new FakeArea();
  denied.failing = true;
  assert.equal((await openWithoutLocal(hostOf(denied))).mode, 'memory');
});

test('resolves a confirmed write as saved', async () => {
  const area = new FakeArea();
  const storage = await openOnArea(area);
  assert.equal(await storage.save('vivarcdi.a', '1'), 'saved');
  assert.deepEqual(area.writes, [{ 'vivarcdi.a': '1' }]);
  const items = new Map<string, string>();
  const local = await PersistentStorage.open(asDocument(localDocument(items)), undefined, silentLogger());
  assert.equal(await local.save('vivarcdi.b', '2'), 'saved');
  assert.equal(items.get('vivarcdi.b'), '2');
});

test('resolves a failed write as failed and keeps the value', async () => {
  const area = new FakeArea();
  const host = hostOf(area);
  const storage = await openOnArea(area, host);
  area.set = (_items, callback): void => {
    host.runtime = { lastError: { message: 'denied' } };
    callback?.();
  };
  assert.equal(await storage.save('vivarcdi.a', '1'), 'failed');
  assert.equal(storage.getItem('vivarcdi.a'), '1');
  area.set = (): void => {
    throw new Error('quota');
  };
  assert.equal(await storage.save('vivarcdi.b', '2'), 'failed');
  assert.equal(storage.getItem('vivarcdi.b'), '2');
  let full = false;
  const local = await PersistentStorage.open(asDocument(localDocument(new Map(), () => full)), undefined, silentLogger());
  full = true;
  assert.equal(await local.save('vivarcdi.c', '3'), 'failed');
});

test('resolves writes in memory as memory', async () => {
  const storage = await openWithoutLocal(undefined);
  assert.equal(await storage.save('vivarcdi.a', '1'), 'memory');
  assert.equal(storage.getItem('vivarcdi.a'), '1');
});
