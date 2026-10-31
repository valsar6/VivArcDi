import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserBookmarks } from '../../src/core/bookmarks/BrowserBookmarks.js';
import type { BrowserRuntime } from '../../src/core/BrowserRuntime.js';
import { BrowserTabs } from '../../src/core/BrowserTabs.js';
import type { ChromeApi, TabsApi } from '../../src/core/BrowserTabs.js';
import { Logger } from '../../src/core/Logger.js';
import type { KeyValueStorage } from '../../src/core/PersistentStorage.js';
import { VivArcDi } from '../../src/core/VivArcDi.js';
import { createDefaultRegistry } from '../../src/modules/index.js';
import { recordingChrome } from '../modules/folders/fakes.js';
import { FakeDocument, FakeElement, FakeLoader, SilentSink } from './fakes.js';

const MODULE_IDS = [
  'activation-marker',
  'favorites-grid',
  'peek',
  'reopen-pinned',
  'bookmark-folders',
  'folder-preview',
  'pinned-tabs',
  'space-header',
  'today-archive',
  'copy-url',
  'incognito',
];
const WRITING_BOOKMARK_CALLS = ['create', 'update', 'move', 'remove', 'removeTree'];

class WriteLog {
  public attempts: string[] = [];

  public readonly storage: KeyValueStorage = {
    getItem: () => null,
    setItem: (key) => {
      this.attempts.push(`storage ${key}`);
      throw new Error('storage must not be written');
    },
  };

  public tabsApi(): TabsApi {
    const record = (name: string) => (): void => void this.attempts.push(`tabs ${name}`);
    const event = { addListener: (): void => undefined, removeListener: (): void => undefined };
    return {
      get: (...args: unknown[]) => (args.at(-1) as (tab: unknown) => void)({ id: 1 }),
      query: (...args: unknown[]) => (args.at(-1) as (tabs: unknown[]) => void)([]),
      create: record('create'),
      update: record('update'),
      discard: record('discard'),
      reload: record('reload'),
      remove: record('remove'),
      onUpdated: event,
      onActivated: event,
      onCreated: event,
      onRemoved: event,
    };
  }
}

interface Run {
  attempts: string[];
  marked: boolean;
  started: string[];
}

async function runWindow(privateWindow: boolean, incognito: boolean): Promise<Run> {
  const log = new WriteLog();
  const bookmarks = recordingChrome([]);
  const chromeApi = { tabs: log.tabsApi() } as unknown as ChromeApi;
  const browser = new FakeElement();
  const app = new VivArcDi({
    loader: new FakeLoader({
      'config.json': { styles: [], modules: Object.fromEntries(MODULE_IDS.map((id) => [id, { enabled: id !== 'incognito' || incognito }])) },
      'build.json': { vivarcdiVersion: '0.1.0', vivaldiVersion: '8.1.3740.12' },
      'selectors/index.json': { versions: ['8.1'] },
      'selectors/8.1.json': { browser: '#browser' },
    }),
    registry: createDefaultRegistry(),
    logger: new Logger('test', new SilentSink()),
    document: new FakeDocument({ '#browser': browser }) as unknown as Document,
    tabs: new BrowserTabs(chromeApi),
    bookmarks: new BrowserBookmarks(bookmarks.host),
    runtime: { isPrivateWindow: async () => privateWindow, currentWindowId: async () => 1 } as unknown as BrowserRuntime,
    storage: log.storage,
  });
  await app.start();
  const started = app.startedModules;
  const marked = 'vivarcdiPrivate' in browser.dataset;
  await app.stop();
  return { attempts: [...log.attempts, ...bookmarks.calls.filter((call) => WRITING_BOOKMARK_CALLS.includes(call))], marked, started };
}

test('stores nothing from a private window', async () => {
  assert.deepEqual((await runWindow(true, true)).attempts, []);
  assert.deepEqual((await runWindow(true, false)).attempts, []);
});

test('draws nothing in a normal window', async () => {
  const { started, marked } = await runWindow(false, true);
  assert.equal(started.includes('incognito'), false);
  assert.equal(marked, false);
});

test('disabled module leaves private windows plain', async () => {
  const { started, marked } = await runWindow(true, false);
  assert.equal(started.includes('incognito'), false);
  assert.equal(marked, false);
});
