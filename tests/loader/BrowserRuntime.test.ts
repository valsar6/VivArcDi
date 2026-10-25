import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../src/core/BrowserRuntime.js';
import type { ChromeApi, RuntimeMessageListener } from '../../src/core/BrowserTabs.js';

test('BrowserRuntime listens to runtime messages and removes the listener', () => {
  const listeners = new Set<RuntimeMessageListener>();
  const onMessage = {
    addListener: (listener: RuntimeMessageListener): void => {
      listeners.add(listener);
    },
    removeListener: (listener: RuntimeMessageListener): void => {
      listeners.delete(listener);
    },
  };
  const runtime = new BrowserRuntime({ runtime: { onMessage } });
  assert.ok(runtime.messagesAvailable);
  const remove = runtime.onMessage(() => {});
  assert.equal(listeners.size, 1);
  remove();
  assert.equal(listeners.size, 0);
});

test('BrowserRuntime opens windows through chrome.windows', async () => {
  const opened: unknown[] = [];
  const windows = {
    create: (properties: unknown, callback: () => void): void => {
      opened.push(properties);
      callback();
    },
  };
  await new BrowserRuntime({ windows } as unknown as ChromeApi).openWindow('https://a.example/');
  assert.deepEqual(opened, [{ url: 'https://a.example/' }]);
});

test('BrowserRuntime without chrome reports what is missing', async () => {
  const runtime = new BrowserRuntime(undefined);
  assert.equal(runtime.messagesAvailable, false);
  assert.throws(() => runtime.onMessage(() => {}), /onMessage is not available/);
  await assert.rejects(runtime.openWindow('https://a.example/'), /chrome.windows is not available/);
});
