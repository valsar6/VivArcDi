import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserTabs } from '../../src/core/BrowserTabs.js';
import type { ChromeApi, TabUpdateListener } from '../../src/core/BrowserTabs.js';
import { FrameTask } from '../../src/core/FrameTask.js';

type Callback = (result: unknown) => void;

interface FakeChrome {
  api: ChromeApi;
  listeners: Set<TabUpdateListener>;
  calls: Array<[string, number]>;
}

function fakeChrome(): FakeChrome {
  const listeners = new Set<TabUpdateListener>();
  const calls: Array<[string, number]> = [];
  const runtime: { lastError: { message: string } | undefined } = { lastError: undefined };
  const api = {
    runtime,
    tabs: {
      get: (id: number, callback: Callback): void => {
        if (id === 0) {
          runtime.lastError = { message: 'No tab with id: 0' };
          callback(undefined);
          runtime.lastError = undefined;
          return;
        }
        callback({ id });
      },
      update: (id: number, change: object, callback: Callback): void => callback({ id, ...change }),
      create: (properties: object, callback: Callback): void => callback({ id: 9, ...properties }),
      reload: (id: number, callback: Callback): void => callback(calls.push(['reload', id])),
      remove: (id: number, callback: Callback): void => callback(calls.push(['remove', id])),
      onUpdated: {
        addListener: (listener: TabUpdateListener): void => {
          listeners.add(listener);
        },
        removeListener: (listener: TabUpdateListener): void => {
          listeners.delete(listener);
        },
      },
    },
  } as unknown as ChromeApi;
  return { api, listeners, calls };
}

test('BrowserTabs turns callbacks into promises', async () => {
  const tabs = new BrowserTabs(fakeChrome().api);
  assert.ok(tabs.available);
  assert.deepEqual(await tabs.get(7), { id: 7 });
  assert.deepEqual(await tabs.activate(7), { id: 7, active: true });
});

test('BrowserTabs rejects with chrome.runtime.lastError', async () => {
  await assert.rejects(new BrowserTabs(fakeChrome().api).get(0), /No tab with id: 0/);
});

test('BrowserTabs returns a function that removes the listener', () => {
  const { api, listeners } = fakeChrome();
  const remove = new BrowserTabs(api).onUpdated(() => {});
  assert.equal(listeners.size, 1);
  remove();
  assert.equal(listeners.size, 0);
});

test('BrowserTabs creates and updates tabs', async () => {
  const tabs = new BrowserTabs(fakeChrome().api);
  assert.deepEqual(await tabs.create({ url: 'https://a.example/' }), { id: 9, url: 'https://a.example/' });
  assert.deepEqual(await tabs.update(7, { vivExtData: '{}' }), { id: 7, vivExtData: '{}' });
});

test('BrowserTabs reloads and removes tabs', async () => {
  const { api, calls } = fakeChrome();
  const tabs = new BrowserTabs(api);
  await tabs.reload(4);
  await tabs.remove(5);
  assert.deepEqual(calls, [
    ['reload', 4],
    ['remove', 5],
  ]);
});

test('BrowserTabs without onCreated throws when asked to listen to it', () => {
  assert.throws(() => new BrowserTabs(fakeChrome().api).onCreated(() => {}), /onCreated is not available/);
});

test('BrowserTabs without onActivated throws when asked to listen to it', () => {
  assert.throws(() => new BrowserTabs(fakeChrome().api).onActivated(() => {}), /onActivated is not available/);
});

test('BrowserTabs without chrome is unavailable', () => {
  const tabs = new BrowserTabs(undefined);
  assert.equal(tabs.available, false);
  assert.throws(() => tabs.get(1), /not available/);
});

test('FrameTask merges requests into one run per frame', () => {
  const frames: Array<() => void> = [];
  let runs = 0;
  const task = new FrameTask(
    (): void => {
      runs += 1;
    },
    { schedule: (run): number => frames.push(run), cancel: (): void => {} },
  );
  task.request();
  task.request();
  assert.equal(frames.length, 1);
  frames.shift()?.();
  assert.equal(runs, 1);
  task.request();
  task.cancel();
  assert.equal(task.pending, false);
});
