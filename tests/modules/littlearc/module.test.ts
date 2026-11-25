import { afterEach, beforeEach, test } from 'node:test';
import { LITTLE_ARC_OPTIONS } from '../../../src/modules/littlearc/LittleArcOptions.js';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../../src/core/browser/BrowserPrefs.js';
import { BrowserRuntime } from '../../../src/core/browser/BrowserRuntime.js';
import { BrowserSearch } from '../../../src/core/browser/BrowserSearch.js';
import type { StoredFormat, StoredRead } from '../../../src/core/browser/StoredFormat.js';
import type { ChromeApi, RuntimeMessageListener } from '../../../src/core/browser/BrowserTabs.js';
import { BrowserWindows } from '../../../src/core/browser/BrowserWindows.js';
import type { WindowDetails, WindowUpdate } from '../../../src/core/browser/BrowserWindows.js';
import { SidebarBox } from '../../../src/modules/littlearc/SidebarBox.js';
import { KeepLabel } from '../../../src/modules/littlearc/KeepLabel.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { Logger } from '../../../src/core/support/Logger.js';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import type { LittleArcOptions } from '../../../src/modules/littlearc/LittleArcOptions.js';
import { ShortcutKeys } from '../../../src/core/dom/ShortcutKeys.js';
import { WindowKeys } from '../../../src/core/dom/WindowKeys.js';
import { ExternalLinkWatcher } from '../../../src/modules/littlearc/ExternalLinkWatcher.js';
import { LittleArc } from '../../../src/modules/littlearc/LittleArc.js';
import { LITTLE_ARC_MARK_ATTRIBUTE } from '../../../src/modules/littlearc/LittleArcIndicator.js';
import { LittleArcLauncher } from '../../../src/modules/littlearc/LittleArcLauncher.js';
import { LITTLE_ARC_CONSOLE_PREFIX, adoptMessage, destinationAnswer, pageLinkMessage } from '../../../src/modules/littlearc/LittleArcMessage.js';
import { WorkspaceAdopter } from '../../../src/modules/littlearc/WorkspaceAdopter.js';
import { FakeLoader, SilentSink, silentNotices } from '../../loader/fakes.js';
import { FakeDocument, FakeElement, FakeEvent } from '../peek/fakes.js';

const logger = new Logger('test', new SilentSink());
const screen = { width: 1000, height: 800, left: 0, top: 0 };
const size = { widthPercent: 50, heightPercent: 50 };

function launcherWith(rect: { left: number; right: number; top: number; bottom: number } | null, reads: WindowDetails[] = []): {
  launcher: LittleArcLauncher;
  created: unknown[];
  updates: Array<{ id: number; properties: WindowUpdate }>;
  gets: number[];
} {
  const created: unknown[] = [];
  const updates: Array<{ id: number; properties: WindowUpdate }> = [];
  const gets: number[] = [];
  let nextRead = 0;
  const sidebar = rect === null ? null : new SidebarBox(rect.left, rect.right, rect.top, rect.bottom);
  const launcher = new LittleArcLauncher({
    windows: {
      create: async (properties): Promise<WindowDetails> => (created.push(properties), { id: 77 }),
      get: async (id): Promise<WindowDetails> => (gets.push(id), reads[nextRead++] ?? { id }),
      update: async (id, properties): Promise<WindowDetails> => (updates.push({ id, properties }), { id }),
    },
    registry: { mark: (): void => undefined },
    screen: (): typeof screen => screen,
    size,
    sidebar: (): SidebarBox | null => sidebar,
    mainWindowId: 1,
    logger,
  });
  return { launcher, created, updates, gets };
}

function placementOf(properties: unknown): Record<string, unknown> {
  const { left, top, width, height, type, focused } = properties as Record<string, unknown>;
  return { left, top, width, height, type, focused };
}

test('little arc falls back to the default action when the window fails', async () => {
  const marked: number[] = [];
  const failing = new LittleArcLauncher({
    windows: {
      create: (): Promise<WindowDetails> => Promise.reject(new Error('no window')),
      get: async (id): Promise<WindowDetails> => ({ id }),
      update: async (id): Promise<WindowDetails> => ({ id }),
    },
    registry: { mark: (id): void => void marked.push(id) },
    screen: (): typeof screen => screen,
    size,
    sidebar: (): SidebarBox | null => null,
    mainWindowId: 1,
    logger,
  });
  assert.equal(await failing.adopt(5), false);
  assert.equal(await failing.openBlank(), false);
  assert.equal(marked.length, 0);
  const created: unknown[] = [];
  const working = new LittleArcLauncher({
    windows: {
      create: async (properties): Promise<WindowDetails> => (created.push(properties), { id: 42 }),
      get: async (id): Promise<WindowDetails> => ({ id }),
      update: async (id): Promise<WindowDetails> => ({ id }),
    },
    registry: { mark: (id): void => void marked.push(id) },
    screen: (): typeof screen => screen,
    size,
    sidebar: (): SidebarBox | null => null,
    mainWindowId: 1,
    logger,
  });
  assert.equal(await working.adopt(5), true);
  assert.deepEqual(created, [{ tabId: 5, type: 'popup', focused: true, width: 500, height: 400, left: 250, top: 200 }]);
  assert.deepEqual(marked, [42]);
});

test('uses the same placement for every Little Arc opening', async () => {
  const { launcher, created } = launcherWith({ left: 0, right: 240, top: 0, bottom: 800 });
  assert.equal(await launcher.openBlank(), true);
  assert.equal(await launcher.openAddress('https://example.test'), true);
  assert.notEqual(await launcher.openAddressIn('https://other.test'), null);
  assert.equal(await launcher.adopt(5), true);
  assert.equal(created.length, 4);
  for (const properties of created) {
    assert.deepEqual(placementOf(properties), { left: 252, top: 200, width: 500, height: 400, type: 'popup', focused: true });
  }
});

test('keeps the Little Arc popup bar and the Open in workspace action', async () => {
  const { launcher, created, updates } = launcherWith({ left: 0, right: 240, top: 0, bottom: 800 });
  assert.equal(await launcher.openAddress('https://example.test'), true);
  assert.deepEqual(placementOf(created[0]), { left: 252, top: 200, width: 500, height: 400, type: 'popup', focused: true });
  assert.equal(KeepLabel.of('Lavoro', 'MacIntel').prefix, 'Open in');
  assert.deepEqual(updates, []);
});

test('moves Little Arc clear of the sidebar after creation', async () => {
  const { launcher, created, updates, gets } = launcherWith({ left: 0, right: 240, top: 0, bottom: 800 }, [
    { id: 77, left: 0, top: 0, width: 500, height: 400 },
    { id: 77, left: 252, top: 200, width: 500, height: 400 },
  ]);
  assert.equal(await launcher.openBlank(), true);
  assert.deepEqual(gets, [77, 77]);
  assert.deepEqual(updates, [{ id: 77, properties: { left: 252, top: 200, width: 500, height: 400 } }]);
  assert.deepEqual(placementOf(created[0]), { left: 252, top: 200, width: 500, height: 400, type: 'popup', focused: true });
});

test('leaves the main window focused when Little Arc cannot clear the sidebar', async () => {
  const overlapping = { id: 77, left: 0, top: 0, width: 500, height: 400 };
  const { launcher, updates } = launcherWith({ left: 0, right: 240, top: 0, bottom: 800 }, [overlapping, overlapping]);
  assert.equal(await launcher.openBlank(), true);
  assert.deepEqual(updates, [
    { id: 77, properties: { left: 252, top: 200, width: 500, height: 400 } },
    { id: 1, properties: { focused: true } },
  ]);
});

test('external link watcher moves only the tabs the detector accepts', async () => {
  const adopted: number[] = [];
  const launcher = { adopt: async (tabId: number): Promise<boolean> => (adopted.push(tabId), true) };
  const tabs = { get: async (): Promise<chrome.tabs.Tab> => ({ id: 1 }) as chrome.tabs.Tab };
  assert.equal(await new ExternalLinkWatcher(tabs, { accepts: (): boolean => false }, launcher, logger).check(1, 0), false);
  assert.equal(await new ExternalLinkWatcher(tabs, { accepts: (): boolean => true }, launcher, logger).check(1, 0), true);
  assert.deepEqual(adopted, [1]);
  const broken = { get: (): Promise<chrome.tabs.Tab> => Promise.reject(new Error('gone')) };
  assert.equal(await new ExternalLinkWatcher(broken, { accepts: (): boolean => true }, launcher, logger).check(1, 0), false);
});

class AdopterTabs {
  public calls: string[] = [];
  public data = '';

  public async get(tabId: number): Promise<chrome.tabs.Tab> {
    return { id: tabId, vivExtData: this.data } as unknown as chrome.tabs.Tab;
  }

  public async update(tabId: number, properties: Record<string, unknown>): Promise<chrome.tabs.Tab> {
    this.calls.push(`update ${String(properties['vivExtData'])}`);
    return this.get(tabId);
  }

  public async move(tabId: number, properties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab> {
    this.calls.push(`move ${tabId} ${properties.windowId} ${properties.index}`);
    return this.get(tabId);
  }

  public async activate(tabId: number): Promise<chrome.tabs.Tab> {
    this.calls.push(`activate ${tabId}`);
    return this.get(tabId);
  }
}

function adopterFor(lastFocused: number, recent: string | null): { adopter: WorkspaceAdopter; tabs: AdopterTabs; removed: number[] } {
  const tabs = new AdopterTabs();
  const removed: number[] = [];
  const adopter = new WorkspaceAdopter({
    tabs,
    windows: { lastFocused: async (): Promise<WindowDetails> => ({ id: lastFocused }), remove: async (id): Promise<void> => void removed.push(id) },
    windowId: 1,
    recentWorkspace: (): string | null => recent,
    picker: { pick: async (workspace): Promise<string | null> => workspace },
    logger,
  });
  return { adopter, tabs, removed };
}

test('workspace adopter moves the page into the window that was in front', async () => {
  const { adopter, tabs, removed } = adopterFor(1, '1700000000000');
  assert.equal(await adopter.adopt(adoptMessage(8, 3)), true);
  assert.equal(tabs.calls[0], 'move 8 1 -1');
  assert.match(tabs.calls[1] ?? '', /^update .*workspaceId/);
  assert.equal(tabs.calls[2], 'activate 8');
  assert.deepEqual(removed, [3]);
});

test('workspace adopter answers where the page would go', async () => {
  const colors = { space: '#111111', pill: '#222222', ink: '#eeeeee' };
  const make = (lastFocused: number): WorkspaceAdopter =>
    new WorkspaceAdopter({
      tabs: new AdopterTabs(),
      windows: { lastFocused: async (): Promise<WindowDetails> => ({ id: lastFocused }), remove: async (): Promise<void> => undefined },
      windowId: 1,
      recentWorkspace: (): string | null => '7',
      picker: { pick: async (workspace): Promise<string | null> => workspace },
      destination: { nameOf: (id): string | null => (id === '7' ? 'Lavoro' : null), colors: (): typeof colors => colors },
      logger,
    });
  assert.deepEqual(await make(1).describeDestination(), destinationAnswer('Lavoro', colors));
  assert.equal(await make(2).describeDestination(), null);
  assert.deepEqual(await adopterFor(1, '7').adopter.describeDestination(), destinationAnswer(null, null));
});

test('workspace adopter ignores requests when another window was in front', async () => {
  const { adopter, tabs, removed } = adopterFor(2, '1700000000000');
  assert.equal(await adopter.adopt(adoptMessage(8, 3)), false);
  assert.deepEqual(tabs.calls, []);
  assert.deepEqual(removed, []);
});

test('workspace adopter leaves the workspace alone when none is known', async () => {
  const { adopter, tabs } = adopterFor(1, null);
  assert.equal(await adopter.adopt(adoptMessage(8, 3)), true);
  assert.deepEqual(tabs.calls, ['move 8 1 -1', 'activate 8']);
});

class Events<ListenerType> extends FakeEvent<ListenerType> {}

class FakeObserver {
  public observe(): void {}

  public disconnect(): void {}
}

interface Page {
  tabId: number;
  pinned?: boolean;
  favoriteId?: string;
}

let savedObserver: unknown;

beforeEach(() => {
  savedObserver = Reflect.get(globalThis, 'MutationObserver');
  Object.assign(globalThis, { MutationObserver: FakeObserver });
});

afterEach(() => Object.assign(globalThis, { MutationObserver: savedObserver }));

function tabOf(page: Page): chrome.tabs.Tab {
  const own = page.favoriteId === undefined ? {} : { favoriteId: page.favoriteId };
  return { id: page.tabId, pinned: page.pinned === true, vivExtData: JSON.stringify({ vivarcdi: own }) } as unknown as chrome.tabs.Tab;
}

const selectors = new SelectorCatalog(
  { browser: '#browser', webviewContainer: '#webview-container', tabWebview: '#webview-container webview[tab_id]', tabWrapper: '.tab-wrapper' },
  'test',
);

function contextOf(options: Record<string, unknown>, type: string, pages: Page[] = []): {
  context: ModuleContext<LittleArcOptions>;
  document: FakeDocument;
  created: Events<(tab: chrome.tabs.Tab) => void>;
  focus: Events<(id: number) => void>;
  removed: Events<(id: number) => void>;
  messages: Events<RuntimeMessageListener>;
  webviews: FakeElement[];
  windowCalls: Array<Record<string, unknown>>;
} {
  const created = new Events<(tab: chrome.tabs.Tab) => void>();
  const focus = new Events<(id: number) => void>();
  const removed = new Events<(id: number) => void>();
  const messages = new Events<RuntimeMessageListener>();
  const container = new FakeElement('div');
  const webviews = pages.map((page) => {
    const webview = new FakeElement('webview', { tab_id: String(page.tabId) });
    container.append(webview);
    return webview;
  });
  const document = new FakeDocument({ '#webview-container': container, '#browser': new FakeElement('div') });
  const windowCalls: Array<Record<string, unknown>> = [];
  let lastBounds: Record<string, unknown> = {};
  const tabs = {
    available: true,
    get: async (tabId: number): Promise<chrome.tabs.Tab> => {
      const page = pages.find((candidate) => candidate.tabId === tabId);
      if (page === undefined) {
        throw new Error(`no tab ${tabId}`);
      }
      return tabOf(page);
    },
    onCreated: (listener: (tab: chrome.tabs.Tab) => void): (() => void) => (created.addListener(listener), (): void => created.removeListener(listener)),
    onUpdated: () => (): void => undefined,
    onActivated: () => (): void => undefined,
    query: async (): Promise<chrome.tabs.Tab[]> => [],
  };
  const chromeApi = {
    windows: {
      create: (properties: Record<string, unknown>, callback: (details: unknown) => void): void => {
        windowCalls.push(properties);
        lastBounds = properties;
        callback({ id: 77 });
      },
      get: (id: number, callback: (details: unknown) => void): void => callback({ id, ...lastBounds }),
      update: (id: number, properties: Record<string, unknown>, callback: (details: unknown) => void): void => callback({ id, ...properties }),
      getCurrent: (callback: (info: unknown) => void): void => callback({ id: 1, type }),
      onFocusChanged: focus,
      onRemoved: removed,
    },
    runtime: { onMessage: messages },
  } as unknown as ChromeApi;
  const context = {
    document,
    logger,
    options: { ...LITTLE_ARC_OPTIONS.defaults, ...options },
    tabs,
    windows: new BrowserWindows(chromeApi),
    search: new BrowserSearch(chromeApi),
    runtime: new BrowserRuntime(chromeApi),
    prefs: new BrowserPrefs(undefined),
    selectors,
    storage: {
      getItem: (): null => null,
      setItem: (): void => undefined,
      read: <T>(_key: string, format: StoredFormat<T>): StoredRead<T> => format.decode(null),
    },
    payload: new FakeLoader({ 'page/little-arc-links.js': 'LITTLE_ARC_LINKS' }),
    notices: silentNotices(),
    activeWorkspace: {
      current: null,
      start: async (): Promise<void> => undefined,
      onChange: (): (() => void) => (): void => undefined,
      refresh: async (): Promise<void> => undefined,
      stop: (): void => undefined,
    },
  } as unknown as ModuleContext<LittleArcOptions>;
  return { context, document, created, focus, removed, messages, webviews, windowCalls };
}

test('little arc ignores external links when disabled', async () => {
  const off = contextOf({ externalLinks: false }, 'normal');
  const offModule = new LittleArc();
  await offModule.start(off.context);
  assert.equal(off.created.listeners.size, 0);
  assert.equal(off.focus.listeners.size, 0);
  offModule.stop();
  const on = contextOf({ externalLinks: true }, 'normal');
  const onModule = new LittleArc();
  await onModule.start(on.context);
  assert.equal(on.created.listeners.size, 1);
  assert.equal(on.focus.listeners.size, 1);
  onModule.stop();
});

test('little arc module cleans up on stop', async () => {
  const { context, document, created, focus, messages } = contextOf({}, 'normal');
  const module = new LittleArc();
  await module.start(context);
  assert.equal(document.root.listenerCount(), 1);
  assert.equal(messages.listeners.size, 1);
  module.stop();
  assert.equal(document.root.listenerCount(), 0);
  assert.equal(messages.listeners.size, 0);
  assert.equal(created.listeners.size, 0);
  assert.equal(focus.listeners.size, 0);
});

test('little arc stays off without chrome.windows', async () => {
  const { context } = contextOf({}, 'normal');
  const bare = { ...context, windows: new BrowserWindows(undefined) };
  const module = new LittleArc();
  await module.start(bare);
  module.stop();
});

test('opens a blank link of a pinned page in Little Arc', async () => {
  const { context, webviews, windowCalls } = contextOf({}, 'normal', [{ tabId: 1, pinned: true }]);
  const module = new LittleArc();
  await module.start(context);
  const policy = /install\((.*)\);$/.exec(webviews[0]?.executed[0] ?? '')?.[1] ?? '{}';
  const { token, tabId } = JSON.parse(policy) as { token: string; tabId: number };
  assert.equal(tabId, 1);
  webviews[0]?.dispatch('consolemessage', {
    message: `${LITTLE_ARC_CONSOLE_PREFIX}${JSON.stringify(pageLinkMessage(token, 1, 'https://example.com/new'))}`,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(windowCalls[0]?.['url'], 'https://example.com/new');
  assert.equal(windowCalls[0]?.['type'], 'popup');
  module.stop();
});

test('marks the row a Little Arc window came from and clears it when the window closes', async () => {
  const { context, document, removed, webviews } = contextOf({}, 'normal', [{ tabId: 1, pinned: true }]);
  const row = new FakeElement('div');
  document.elements['.tab-wrapper[data-id="tab-1"]'] = row;
  const module = new LittleArc();
  await module.start(context);
  const policy = /install\((.*)\);$/.exec(webviews[0]?.executed[0] ?? '')?.[1] ?? '{}';
  const { token } = JSON.parse(policy) as { token: string };
  webviews[0]?.dispatch('consolemessage', {
    message: `${LITTLE_ARC_CONSOLE_PREFIX}${JSON.stringify(pageLinkMessage(token, 1, 'https://example.com/new'))}`,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(row.hasAttribute(LITTLE_ARC_MARK_ATTRIBUTE), true);
  removed.listeners.forEach((listener) => listener(77));
  assert.equal(row.hasAttribute(LITTLE_ARC_MARK_ATTRIBUTE), false);
  module.stop();
  assert.equal(removed.listeners.size, 0);
});

test('leaves blank links of ordinary pages to Vivaldi', async () => {
  const { context, webviews } = contextOf({}, 'normal', [{ tabId: 2, pinned: false }]);
  const module = new LittleArc();
  await module.start(context);
  assert.equal(webviews[0]?.executed[0], 'globalThis.VivArcDiLittleArcLinks?.uninstall();');
  module.stop();
});

test('shortcut keys recognize Cmd+Option and Ctrl+Alt with a physical key', () => {
  const event = { key: '˜', code: 'KeyN', metaKey: true, ctrlKey: false, altKey: true, shiftKey: false };
  assert.equal(ShortcutKeys.isCommandOption(event, 'KeyN'), true);
  assert.equal(ShortcutKeys.isCommandOption({ ...event, metaKey: false, ctrlKey: true }, 'KeyN'), true);
  assert.equal(ShortcutKeys.isCommandOption({ ...event, altKey: false }, 'KeyN'), false);
  assert.equal(ShortcutKeys.isCommandOption({ ...event, shiftKey: true }, 'KeyN'), false);
  assert.equal(ShortcutKeys.isCommandOption({ ...event, code: 'KeyM' }, 'KeyN'), false);
});

test('window keys take only the presses they recognize', () => {
  const document = new FakeDocument({});
  const commands: string[] = [];
  let stopped = 0;
  const keys = new WindowKeys(document as unknown as Document, (event) => (event.key === 'a' ? 'go' : null), (command) => commands.push(command));
  keys.attach();
  const press = (key: string): void =>
    document.root.dispatch('keydown', { key, preventDefault: (): void => undefined, stopImmediatePropagation: (): void => void (stopped += 1) });
  press('a');
  press('b');
  assert.deepEqual(commands, ['go']);
  assert.equal(stopped, 1);
  keys.detach();
  assert.equal(document.root.listenerCount(), 0);
});

function windowsApi(lastError?: { message: string }): { windows: BrowserWindows; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const reply = (name: string, result: unknown) => (...args: unknown[]): void => {
    calls.push([name, ...args.slice(0, -1)]);
    (args.at(-1) as (value: unknown) => void)(result);
  };
  const chromeApi = {
    windows: { create: reply('create', { id: 9 }), get: reply('get', { id: 9, left: 10, top: 20, width: 300, height: 200 }), update: reply('update', { id: 9, focused: true }), getCurrent: reply('getCurrent', { id: 1, type: 'popup' }), getLastFocused: reply('getLastFocused', { id: 2 }), remove: reply('remove', undefined) },
    runtime: { lastError },
  } as unknown as ChromeApi;
  return { windows: new BrowserWindows(chromeApi), calls };
}

test('browser windows wrap the callbacks of chrome.windows', async () => {
  const { windows, calls } = windowsApi();
  assert.deepEqual(await windows.create({ tabId: 4, type: 'popup' }), { id: 9 });
  assert.deepEqual(await windows.get(9), { id: 9, left: 10, top: 20, width: 300, height: 200 });
  assert.deepEqual(await windows.update(9, { focused: true }), { id: 9, focused: true });
  assert.deepEqual(await windows.current(), { id: 1, type: 'popup' });
  assert.deepEqual(await windows.lastFocused(['normal']), { id: 2 });
  await windows.remove(9);
  assert.deepEqual(calls, [['create', { tabId: 4, type: 'popup' }], ['get', 9], ['update', 9, { focused: true }], ['getCurrent'], ['getLastFocused', { windowTypes: ['normal'] }], ['remove', 9]]);
  assert.throws(() => windows.onFocusChanged(() => undefined), /onFocusChanged/);
});

test('browser windows report errors and a missing API', async () => {
  await assert.rejects(windowsApi({ message: 'boom' }).windows.current(), /boom/);
  await assert.rejects(windowsApi({ message: 'boom' }).windows.get(9), /boom/);
  assert.equal(new BrowserWindows(undefined).available, false);
  await assert.rejects(new BrowserWindows(undefined).current(), /not available/);
  await assert.rejects(new BrowserWindows(undefined).update(9, { focused: true }), /not available/);
});

test('browser search runs through chrome.search or gives a fallback address', async () => {
  const queries: unknown[] = [];
  const chromeApi = { search: { query: (info: unknown, callback: () => void): void => (queries.push(info), callback()) } } as unknown as ChromeApi;
  const search = new BrowserSearch(chromeApi);
  assert.equal(search.available, true);
  await search.run('cinema times', 4);
  assert.deepEqual(queries, [{ text: 'cinema times', tabId: 4 }]);
  assert.equal(new BrowserSearch(undefined).available, false);
  await assert.rejects(new BrowserSearch(undefined).run('x', 1), /not available/);
  assert.equal(BrowserSearch.fallbackAddress('a b&c'), 'https://duckduckgo.com/?q=a%20b%26c');
});

test('browser runtime sends messages to other windows', async () => {
  const sent: unknown[] = [];
  const chromeApi = { runtime: { sendMessage: (message: unknown, callback: () => void): void => (sent.push(message), callback()) } } as unknown as ChromeApi;
  await new BrowserRuntime(chromeApi).sendMessage({ a: 1 });
  assert.deepEqual(sent, [{ a: 1 }]);
  await assert.rejects(new BrowserRuntime(undefined).sendMessage({}), /not available/);
});
