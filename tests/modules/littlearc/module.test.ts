import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../../src/core/BrowserPrefs.js';
import { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import { BrowserSearch } from '../../../src/core/BrowserSearch.js';
import type { ChromeApi, RuntimeMessageListener } from '../../../src/core/BrowserTabs.js';
import { BrowserWindows } from '../../../src/core/BrowserWindows.js';
import type { WindowDetails } from '../../../src/core/BrowserWindows.js';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { ShortcutKeys } from '../../../src/core/ShortcutKeys.js';
import { WindowKeys } from '../../../src/core/WindowKeys.js';
import { ExternalLinkWatcher } from '../../../src/modules/littlearc/ExternalLinkWatcher.js';
import { LittleArc } from '../../../src/modules/littlearc/LittleArc.js';
import { LittleArcLauncher } from '../../../src/modules/littlearc/LittleArcLauncher.js';
import { adoptMessage, destinationAnswer } from '../../../src/modules/littlearc/LittleArcMessage.js';
import { WorkspaceAdopter } from '../../../src/modules/littlearc/WorkspaceAdopter.js';
import { SilentSink } from '../../loader/fakes.js';
import { FakeDocument, FakeEvent } from '../peek/fakes.js';

const logger = new Logger('test', new SilentSink());
const screen = { width: 1000, height: 800, left: 0, top: 0 };
const size = { widthPercent: 50, heightPercent: 50 };

test('little arc falls back to the default action when the window fails', async () => {
  const marked: number[] = [];
  const failing = new LittleArcLauncher({
    windows: { create: (): Promise<WindowDetails> => Promise.reject(new Error('no window')) },
    registry: { mark: (id): void => void marked.push(id) },
    screen: (): typeof screen => screen,
    size,
    logger,
  });
  assert.equal(await failing.adopt(5), false);
  assert.equal(await failing.openBlank(), false);
  assert.equal(marked.length, 0);
  const created: unknown[] = [];
  const working = new LittleArcLauncher({
    windows: { create: async (properties): Promise<WindowDetails> => (created.push(properties), { id: 42 }) },
    registry: { mark: (id): void => void marked.push(id) },
    screen: (): typeof screen => screen,
    size,
    logger,
  });
  assert.equal(await working.adopt(5), true);
  assert.deepEqual(created, [{ tabId: 5, type: 'popup', focused: true, width: 500, height: 400, left: 250, top: 200 }]);
  assert.deepEqual(marked, [42]);
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

function contextOf(options: Record<string, unknown>, type: string): { context: ModuleContext; document: FakeDocument; created: Events<(tab: chrome.tabs.Tab) => void>; focus: Events<(id: number) => void>; messages: Events<RuntimeMessageListener> } {
  const created = new Events<(tab: chrome.tabs.Tab) => void>();
  const focus = new Events<(id: number) => void>();
  const messages = new Events<RuntimeMessageListener>();
  const document = new FakeDocument({});
  const tabs = {
    available: true,
    onCreated: (listener: (tab: chrome.tabs.Tab) => void): (() => void) => (created.addListener(listener), (): void => created.removeListener(listener)),
    onUpdated: () => (): void => undefined,
    onActivated: () => (): void => undefined,
    query: async (): Promise<chrome.tabs.Tab[]> => [],
  };
  const chromeApi = {
    windows: {
      create: (): void => undefined,
      getCurrent: (callback: (info: unknown) => void): void => callback({ id: 1, type }),
      onFocusChanged: focus,
    },
    runtime: { onMessage: messages },
  } as unknown as ChromeApi;
  const context = {
    document,
    logger,
    options,
    tabs,
    windows: new BrowserWindows(chromeApi),
    search: new BrowserSearch(chromeApi),
    runtime: new BrowserRuntime(chromeApi),
    prefs: new BrowserPrefs(undefined),
    selectors: { has: (): boolean => true, get: (): string => '#browser' },
    storage: { getItem: (): null => null, setItem: (): void => undefined },
  } as unknown as ModuleContext;
  return { context, document, created, focus, messages };
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
    windows: { create: reply('create', { id: 9 }), getCurrent: reply('getCurrent', { id: 1, type: 'popup' }), getLastFocused: reply('getLastFocused', { id: 2 }), remove: reply('remove', undefined) },
    runtime: { lastError },
  } as unknown as ChromeApi;
  return { windows: new BrowserWindows(chromeApi), calls };
}

test('browser windows wrap the callbacks of chrome.windows', async () => {
  const { windows, calls } = windowsApi();
  assert.deepEqual(await windows.create({ tabId: 4, type: 'popup' }), { id: 9 });
  assert.deepEqual(await windows.current(), { id: 1, type: 'popup' });
  assert.deepEqual(await windows.lastFocused(['normal']), { id: 2 });
  await windows.remove(9);
  assert.deepEqual(calls, [['create', { tabId: 4, type: 'popup' }], ['getCurrent'], ['getLastFocused', { windowTypes: ['normal'] }], ['remove', 9]]);
  assert.throws(() => windows.onFocusChanged(() => undefined), /onFocusChanged/);
});

test('browser windows report errors and a missing API', async () => {
  await assert.rejects(windowsApi({ message: 'boom' }).windows.current(), /boom/);
  assert.equal(new BrowserWindows(undefined).available, false);
  await assert.rejects(new BrowserWindows(undefined).current(), /not available/);
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
