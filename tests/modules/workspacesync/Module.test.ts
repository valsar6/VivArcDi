import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../../src/core/BrowserPrefs.js';
import { BrowserWindows } from '../../../src/core/BrowserWindows.js';
import type { ChromeApi } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SYNC_DELAY_MS, WorkspaceSync } from '../../../src/modules/workspacesync/WorkspaceSync.js';
import { FakePrefsApi } from '../../core/prefs.js';
import { FakeDocument, FakeElement } from '../peek/fakes.js';
import { MemoryStorage } from '../reopen/fakes.js';
import { CountingSink, pinnedIn, pinnedTab, world } from './fakes.js';

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const contextOf = (setup: ReturnType<typeof world>, options: Record<string, unknown> = {}): { context: ModuleContext; sink: CountingSink } => {
  const prefs = new FakePrefsApi();
  prefs.values.set('vivaldi.workspaces.list', [{ id: 7, name: 'Casetta', icon: '' }]);
  const chromeApi = {
    windows: {
      create: (): void => undefined,
      getCurrent: (callback: (details: unknown) => void): void => callback({ id: 1 }),
      getAll: (_info: unknown, callback: (details: unknown) => void): void => callback([{ id: 1 }]),
    },
    vivaldiPrivate: { prefs },
  } as unknown as ChromeApi;
  const sink = new CountingSink();
  const context = {
    document: new FakeDocument({ '#browser': new FakeElement() }),
    selectors: { get: (): string => '#browser' },
    logger: new Logger('test', sink),
    options,
    tabs: setup.tabs,
    bookmarks: setup.chrome.reader,
    bookmarkWriter: setup.chrome.writer,
    windows: new BrowserWindows(chromeApi),
    prefs: new BrowserPrefs(prefs),
    storage: new MemoryStorage(),
  } as unknown as ModuleContext;
  return { context, sink };
};

test('syncs once after a burst of changes and stops listening', async () => {
  const setup = world({ tabs: [pinnedTab(1, 'mail')] });
  const { context: moduleContext } = contextOf(setup);
  const module = new WorkspaceSync();
  await module.start(moduleContext);
  assert.equal(setup.tabs.listenerCount(), 4);
  await pause(SYNC_DELAY_MS + 100);
  assert.deepEqual(pinnedIn(setup.chrome, 'Casetta'), ['mail']);
  setup.tabs.open(pinnedTab(2, 'docs'));
  setup.tabs.moved.forEach((listener) => listener(2, { windowId: 1, fromIndex: 1, toIndex: 0 }));
  await pause(SYNC_DELAY_MS / 2);
  assert.deepEqual(pinnedIn(setup.chrome, 'Casetta'), ['mail']);
  await pause(SYNC_DELAY_MS);
  assert.deepEqual(pinnedIn(setup.chrome, 'Casetta'), ['mail', 'docs']);
  module.stop();
  assert.equal(setup.tabs.listenerCount(), 0);
  assert.equal(setup.chrome.listeners.size, 0);
  setup.tabs.open(pinnedTab(3, 'news'));
  await pause(SYNC_DELAY_MS + 100);
  assert.deepEqual(pinnedIn(setup.chrome, 'Casetta'), ['mail', 'docs']);
});

test('stays off without the browser interfaces it needs', async () => {
  const setup = world({});
  const { context, sink } = contextOf(setup);
  const module = new WorkspaceSync();
  await module.start({ ...context, prefs: new BrowserPrefs(undefined) });
  assert.equal(sink.warnings.length, 1);
  assert.equal(setup.tabs.listenerCount(), 0);
  module.stop();
});

test('uses the folder named in the options', async () => {
  const setup = world({ tabs: [pinnedTab(1, 'mail')] });
  const { context: moduleContext } = contextOf(setup, { folder: '  Mine  ' });
  const module = new WorkspaceSync();
  await module.start(moduleContext);
  await pause(SYNC_DELAY_MS + 100);
  assert.deepEqual(setup.chrome.created.slice(0, 2), ['Mine', 'Spaces']);
  module.stop();
});
