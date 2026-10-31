import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../src/core/BrowserRuntime.js';
import type { ChromeApi } from '../../src/core/BrowserTabs.js';

function runtimeWith(getCurrent: (callback: (info?: unknown) => void) => void, lastError?: { message: string }): BrowserRuntime {
  const chromeApi = { windows: { create: (): void => undefined, getCurrent }, runtime: { lastError } } as unknown as ChromeApi;
  return new BrowserRuntime(chromeApi);
}

test('detects a private window', async () => {
  const runtime = runtimeWith((callback) => callback({ id: 7, incognito: true }));
  assert.equal(await runtime.isPrivateWindow(), true);
  assert.equal(await runtime.currentWindowId(), 7);
});

test('reports a normal window as normal', async () => {
  const runtime = runtimeWith((callback) => callback({ id: 3, incognito: false }));
  assert.equal(await runtime.isPrivateWindow(), false);
});

test('rejects when the window cannot be read', async () => {
  await assert.rejects(runtimeWith((callback) => callback(undefined), { message: 'boom' }).isPrivateWindow(), /boom/);
  await assert.rejects(new BrowserRuntime(undefined).isPrivateWindow(), /not available/);
  await assert.rejects(runtimeWith((callback) => callback({})).currentWindowId(), /no id/);
});
