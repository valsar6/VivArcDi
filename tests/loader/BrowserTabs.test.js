import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserTabs } from '../../src/core/BrowserTabs.js';
import { FrameTask } from '../../src/core/FrameTask.js';

function fakeChrome() {
  const chromeApi = {
    runtime: { lastError: undefined },
    tabs: {
      get: (id, callback) => {
        if (id === 0) {
          chromeApi.runtime.lastError = { message: 'No tab with id: 0' };
          callback(undefined);
          chromeApi.runtime.lastError = undefined;
          return;
        }
        callback({ id });
      },
      update: (id, change, callback) => callback({ id, ...change }),
      onUpdated: {
        listeners: new Set(),
        addListener(listener) {
          this.listeners.add(listener);
        },
        removeListener(listener) {
          this.listeners.delete(listener);
        },
      },
    },
  };
  return chromeApi;
}

test('BrowserTabs turns callbacks into promises', async () => {
  const tabs = new BrowserTabs(fakeChrome());
  assert.ok(tabs.available);
  assert.deepEqual(await tabs.get(7), { id: 7 });
  assert.deepEqual(await tabs.activate(7), { id: 7, active: true });
});

test('BrowserTabs rejects with chrome.runtime.lastError', async () => {
  await assert.rejects(new BrowserTabs(fakeChrome()).get(0), /No tab with id: 0/);
});

test('BrowserTabs returns a function that removes the listener', () => {
  const chromeApi = fakeChrome();
  const remove = new BrowserTabs(chromeApi).onUpdated(() => {});
  assert.equal(chromeApi.tabs.onUpdated.listeners.size, 1);
  remove();
  assert.equal(chromeApi.tabs.onUpdated.listeners.size, 0);
});

test('BrowserTabs without chrome is unavailable', () => {
  const tabs = new BrowserTabs(undefined);
  assert.equal(tabs.available, false);
  assert.throws(() => tabs.get(1), /not available/);
});

test('FrameTask merges requests into one run per frame', () => {
  const frames = [];
  let runs = 0;
  const task = new FrameTask(() => (runs += 1), { schedule: (run) => frames.push(run), cancel: () => {} });
  task.request();
  task.request();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(runs, 1);
  task.request();
  task.cancel();
  assert.equal(task.pending, false);
});
