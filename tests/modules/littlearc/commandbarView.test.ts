import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserSearch } from '../../../src/core/browser/BrowserSearch.js';
import type { ChromeApi } from '../../../src/core/browser/BrowserTabs.js';
import { BrowserWindows } from '../../../src/core/browser/BrowserWindows.js';
import { Logger } from '../../../src/core/support/Logger.js';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import { BrowserRuntime } from '../../../src/core/browser/BrowserRuntime.js';
import { BrowserPrefs } from '../../../src/core/browser/BrowserPrefs.js';
import { CommandBarController } from '../../../src/modules/littlearc/commandbar/CommandBarController.js';
import { CommandBarMount } from '../../../src/modules/littlearc/commandbar/CommandBarMount.js';
import { CommandBarView } from '../../../src/modules/littlearc/commandbar/CommandBarView.js';
import { PageFocus } from '../../../src/modules/littlearc/commandbar/PageFocus.js';
import type { Suggestion } from '../../../src/modules/littlearc/commandbar/Suggestion.js';
import { LittleArc } from '../../../src/modules/littlearc/LittleArc.js';
import { settingsFrom } from '../../../src/modules/littlearc/LittleArcSettings.js';
import { SilentSink } from '../../loader/fakes.js';
import { FakeEvent } from '../peek/fakes.js';
import { FakeNode, FakePage, dispatch } from './commandbarFakes.js';

const logger = new Logger('test', new SilentSink());
const google: Suggestion = { url: 'https://google.com/', title: 'Google', host: 'google.com', source: 'history' };
const long: Suggestion = { url: 'https://membership.example-platform.com/', title: 'Rame', host: 'membership.example-platform.com', source: 'tab' };

function barOn(page: FakePage, opened: string[], restored: { count: number }): { mount: CommandBarMount; controller: CommandBarController } {
  const list = { suggest: (): Promise<Suggestion[]> => Promise.resolve([google, long]) };
  const launcher = { openAddress: async (url: string): Promise<boolean> => (opened.push(url), true) };
  const controller = new CommandBarController({ list, launcher, logger });
  const focus = { remember: (): void => void (page.activeElement = null), restore: (): void => void (restored.count += 1) };
  const view = new CommandBarView({ document: page as unknown as Document, controller, focus });
  const mount = new CommandBarMount({ host: (): HTMLElement => page.host as unknown as HTMLElement, controller, view, logger });
  return { mount, controller };
}

const allListeners = (page: FakePage): number => page.created.reduce((total, node) => total + node.listenerCount(), 0);
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

test('command bar removes its elements and listeners on stop', async () => {
  const page = new FakePage();
  const restored = { count: 0 };
  const { mount } = barOn(page, [], restored);
  assert.equal(mount.toggle(), true);
  await settle();
  assert.equal(page.host.children.length, 1);
  assert.ok(allListeners(page) > 0);
  const input = page.created.find((node) => node.tagName === 'input') as FakeNode;
  assert.equal(input.focused, true);
  const rows = page.host.descendants().filter((node) => node.className === 'vivarcdi-command-bar-row');
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.getAttribute('aria-selected'), 'true');
  assert.equal(rows[1]?.byClass('vivarcdi-command-bar-host')[0]?.textContent, '— membership…latform.com');
  mount.stop();
  assert.equal(page.host.children.length, 0);
  assert.equal(allListeners(page), 0);
  assert.equal(restored.count, 1);
  mount.stop();
  assert.equal(restored.count, 1);
});

test('command bar keys and clicks drive the controller', async () => {
  const page = new FakePage();
  const opened: string[] = [];
  const restored = { count: 0 };
  const { mount } = barOn(page, opened, restored);
  mount.toggle();
  await settle();
  const input = page.created.find((node) => node.tagName === 'input') as FakeNode;
  const selected = (): number => page.host.descendants().filter((node) => node.getAttribute('aria-selected') === 'true').length;
  const key = dispatch(input, 'keydown', { key: 'ArrowDown' });
  assert.equal(key.prevented && key.stopped, true);
  const second = page.host.descendants().filter((node) => node.className === 'vivarcdi-command-bar-row')[1] as FakeNode;
  assert.equal(second.getAttribute('aria-selected'), 'true');
  assert.equal(selected(), 1);
  dispatch(input, 'keydown', { key: 'Enter' });
  await settle();
  assert.deepEqual(opened, ['https://membership.example-platform.com/']);
  assert.equal(page.host.children.length, 0);
  assert.equal(restored.count, 1);
  mount.toggle();
  await settle();
  const row = page.host.descendants().filter((node) => node.className === 'vivarcdi-command-bar-row')[0] as FakeNode;
  dispatch(row.children[1] as FakeNode, 'click');
  await settle();
  assert.deepEqual(opened.at(-1), 'https://google.com/');
  mount.toggle();
  await settle();
  dispatch(page.created.findLast((node) => node.tagName === 'input') as FakeNode, 'keydown', { key: 'Escape' });
  assert.equal(page.host.children.length, 0);
});

test('command bar swallows clicks outside the card and closes on them', async () => {
  const page = new FakePage();
  const opened: string[] = [];
  const { mount } = barOn(page, opened, { count: 0 });
  mount.toggle();
  await settle();
  const catcher = page.host.children[0] as FakeNode;
  const card = catcher.children[0] as FakeNode;
  const inside = dispatch(card.children[0] as FakeNode, 'mousedown');
  assert.equal(inside.prevented || inside.stopped, false);
  const reached: string[] = [];
  page.host.addEventListener('click', () => reached.push('click'));
  page.host.addEventListener('mousedown', () => reached.push('mousedown'));
  page.host.addEventListener('pointerdown', () => reached.push('pointerdown'));
  ['mousedown', 'click'].forEach((type) => {
    const event = dispatch(catcher, type);
    assert.equal(event.prevented && event.stopped, true);
  });
  assert.equal(page.host.children.length, 1);
  const press = dispatch(catcher, 'pointerdown');
  assert.equal(press.prevented && press.stopped, true);
  assert.deepEqual(reached, []);
  assert.equal(page.host.children.length, 0);
  assert.deepEqual(opened, []);
});

test('page focus gives the focus back or falls to the active page', async () => {
  const kept = new FakeNode('input');
  kept.parent = new FakeNode('div');
  const page = { activeElement: kept, querySelectorAll: (): FakeNode[] => [] };
  const focus = new PageFocus({ document: page as unknown as Document, tabs: { query: async (): Promise<chrome.tabs.Tab[]> => [] }, windowId: 1, webviewSelector: 'webview' });
  focus.remember();
  focus.restore();
  assert.equal(kept.focused, true);
  const webview = new FakeNode('webview');
  webview.setAttribute('tab_id', '7');
  const other = new FakeNode('webview');
  other.setAttribute('tab_id', '8');
  const detached = { activeElement: new FakeNode('input'), querySelectorAll: (): FakeNode[] => [other, webview] };
  const tabs = { query: async (): Promise<chrome.tabs.Tab[]> => [{ id: 7 } as chrome.tabs.Tab] };
  const fallback = new PageFocus({ document: detached as unknown as Document, tabs, windowId: 1, webviewSelector: 'webview' });
  fallback.remember();
  fallback.restore();
  await settle();
  assert.equal(webview.focused, true);
  assert.equal(other.focused, false);
});

function contextOf(options: Record<string, unknown>, hasHost: boolean): { context: ModuleContext; created: unknown[]; page: FakePage } {
  const created: unknown[] = [];
  const page = new FakePage();
  const document = {
    addEventListener: (type: string, listener: () => void, capture: boolean): void => page.host.addEventListener(type, listener, capture),
    removeEventListener: (type: string, listener: () => void, capture: boolean): void => page.host.removeEventListener(type, listener, capture),
    querySelector: (): FakeNode | null => (hasHost ? page.host : null),
    querySelectorAll: (): FakeNode[] => [],
    createElement: (tag: string): FakeNode => page.createElement(tag),
    createElementNS: (namespace: string, tag: string): FakeNode => page.createElementNS(namespace, tag),
    activeElement: null,
  };
  const chromeApi = {
    windows: {
      create: (properties: unknown, callback: (details: unknown) => void): void => (created.push(properties), callback({ id: 5 })),
      getCurrent: (callback: (info: unknown) => void): void => callback({ id: 1, type: 'normal' }),
      onFocusChanged: new FakeEvent(),
    },
    runtime: { onMessage: new FakeEvent() },
  } as unknown as ChromeApi;
  const tabs = { available: true, onCreated: (): (() => void) => (): void => undefined, onUpdated: (): (() => void) => (): void => undefined, query: async (): Promise<chrome.tabs.Tab[]> => [] };
  const none = { search: async (): Promise<never[]> => [] };
  const context = {
    document,
    logger,
    options,
    tabs,
    bookmarks: none,
    history: none,
    windows: new BrowserWindows(chromeApi),
    search: new BrowserSearch(chromeApi),
    runtime: new BrowserRuntime(chromeApi),
    prefs: new BrowserPrefs(undefined),
    selectors: { has: (): boolean => true, get: (): string => '#browser' },
    storage: { getItem: (): null => null, setItem: (): void => undefined },
  } as unknown as ModuleContext;
  return { context, created, page };
}

const shortcut = { key: '˜', code: 'KeyN', metaKey: false, ctrlKey: true, altKey: true, shiftKey: false };

test('little arc opens the blank window when the command bar is off or cannot mount', async () => {
  for (const [options, hasHost] of [[{ commandBar: false }, true], [{ commandBar: true }, false]] as const) {
    const { context, created, page } = contextOf(options, hasHost);
    const module = new LittleArc();
    await module.start(context);
    dispatch(page.host, 'keydown', shortcut);
    await settle();
    assert.equal(created.length, 1);
    assert.equal((created[0] as { url: string }).url, 'about:blank');
    module.stop();
  }
  const { context, created, page } = contextOf({ commandBar: true }, true);
  const module = new LittleArc();
  await module.start(context);
  dispatch(page.host, 'keydown', shortcut);
  await settle();
  assert.equal(created.length, 0);
  assert.equal(page.host.children.length, 1);
  dispatch(page.host, 'keydown', shortcut);
  await settle();
  assert.equal(page.host.children.length, 0);
  assert.equal(created.length, 0);
  module.stop();
});

test('little arc settings read the commandBar option', () => {
  assert.equal(settingsFrom({}).commandBar, true);
  assert.equal(settingsFrom({ commandBar: false }).commandBar, false);
  assert.equal(settingsFrom({ commandBar: 'no' }).commandBar, false);
});
