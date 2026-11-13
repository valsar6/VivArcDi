import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabMenuItems } from '../../../../src/modules/folders/favoritelinks/TabMenuItems.js';
import type { ContextMenuApi, TabMenuCommand } from '../../../../src/modules/folders/favoritelinks/TabMenuItems.js';
import { Logger } from '../../../../src/core/support/Logger.js';
import { asDocument, DomDocument } from '../../../core/dom.js';

const ITEMS = [
  { type: 'command', id: 'new-tab', label: 'New Tab', enabled: true, checked: false },
  { type: 'separator' },
  { type: 'command', id: 'close-tab', label: 'Close Tab', enabled: true, checked: false },
];

const rowOf = (tabId: number): unknown => {
  const wrapper = { dataset: { id: `tab-${tabId}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
};

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Shown {
  params: { items: Array<Record<string, unknown>> };
  callback?: (...values: unknown[]) => void;
}

class FakeMenu implements ContextMenuApi {
  public shown: Shown[] = [];
  public listeners = new Set<(...values: unknown[]) => void>();
  public show: unknown = (params: Shown['params'], callback?: Shown['callback']): string => {
    this.shown.push(callback === undefined ? { params } : { params, callback });
    return 'shown';
  };

  public onActivated = {
    addListener: (listener: (...values: unknown[]) => void): void => void this.listeners.add(listener),
    removeListener: (listener: (...values: unknown[]) => void): void => void this.listeners.delete(listener),
  };
}

interface Setup {
  dom: DomDocument;
  api: FakeMenu;
  items: TabMenuItems;
  ran: string[];
  warnings: unknown[][];
  clock: { now: number };
  original: unknown;
  rightClick: (tabId: number) => void;
}

function setup(tab: Partial<chrome.tabs.Tab> = {}, contextMenu: FakeMenu | null = new FakeMenu()): Setup {
  const dom = new DomDocument();
  const ran: string[] = [];
  const warnings: unknown[][] = [];
  const clock = { now: 1000 };
  const logger = new Logger('test', { info: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message), error: (): void => undefined });
  const commands: TabMenuCommand[] = [
    { id: 'vivarcdi-pin-tab', label: 'Pin tab', run: (found): void => void ran.push(`pin ${found.id}`) },
    { id: 'vivarcdi-tile-tab', label: 'Tile tab', run: (found): void => void ran.push(`tile ${found.id}`) },
  ];
  const original = contextMenu?.show;
  const items = new TabMenuItems({
    document: asDocument(dom),
    contextMenu: contextMenu ?? undefined,
    wrapperSelector: '.wrapper',
    tabs: { get: async (id): Promise<chrome.tabs.Tab> => ({ id, url: 'https://example.com/', ...tab }) as chrome.tabs.Tab },
    commands,
    appliesTo: (found): boolean => found.pinned !== true,
    logger,
    now: (): number => clock.now,
  });
  items.start();
  return {
    dom,
    api: contextMenu as FakeMenu,
    items,
    ran,
    warnings,
    clock,
    original,
    rightClick: (tabId): void => dom.emit('contextmenu', { target: rowOf(tabId) }),
  };
}

const idsOf = (shown: Shown | undefined): unknown[] => shown?.params.items.map((item) => item['id'] ?? item['type']) ?? [];

test('adds a separator and the commands after the items of the menu of a tab', async () => {
  const { api, rightClick } = setup();
  rightClick(5);
  const result = await (api.show as (...args: unknown[]) => Promise<unknown>)({ items: ITEMS });
  assert.equal(result, 'shown');
  assert.deepEqual(idsOf(api.shown[0]), ['new-tab', 'separator', 'close-tab', 'separator', 'vivarcdi-pin-tab', 'vivarcdi-tile-tab']);
  assert.deepEqual(api.shown[0]?.params.items.at(-1), { type: 'command', id: 'vivarcdi-tile-tab', label: 'Tile tab', enabled: true, checked: false });
});

test('runs the command with the tab when the callback reports its id', async () => {
  const { api, rightClick, ran } = setup();
  const vivaldi: unknown[] = [];
  rightClick(5);
  await (api.show as (...args: unknown[]) => Promise<unknown>)({ items: ITEMS }, (...values: unknown[]) => void vivaldi.push(values));
  api.shown[0]?.callback?.('vivarcdi-tile-tab');
  await settle();
  assert.deepEqual(ran, ['tile 5']);
  assert.deepEqual(vivaldi, []);
});

test('hands any other id to Vivaldi', async () => {
  const { api, rightClick, ran } = setup();
  const vivaldi: unknown[] = [];
  rightClick(5);
  await (api.show as (...args: unknown[]) => Promise<unknown>)({ items: ITEMS }, (...values: unknown[]) => void vivaldi.push(values));
  api.shown[0]?.callback?.('close-tab');
  await settle();
  assert.deepEqual(ran, []);
  assert.deepEqual(vivaldi, [['close-tab']]);
});

test('runs the command when the activation event reports its id, once', async () => {
  const { api, rightClick, ran } = setup();
  rightClick(5);
  await (api.show as (...args: unknown[]) => Promise<unknown>)({ items: ITEMS });
  [...api.listeners].forEach((listener) => {
    listener(1, { id: 'vivarcdi-pin-tab' });
    listener(1, { id: 'vivarcdi-pin-tab' });
  });
  await settle();
  assert.deepEqual(ran, ['pin 5']);
});

test('passes the menus of anything but a tab through unchanged', () => {
  const { api, dom, rightClick } = setup();
  const params = { items: ITEMS };
  (api.show as (...args: unknown[]) => unknown)(params);
  rightClick(5);
  dom.emit('contextmenu', { target: { closest: (): null => null } });
  assert.equal((api.show as (...args: unknown[]) => unknown)(params), 'shown');
  assert.equal(api.shown[0]?.params, params);
  assert.equal(api.shown[1]?.params, params);
});

test('passes the menu through when the right click was a while ago', async () => {
  const { api, rightClick, clock } = setup();
  rightClick(5);
  clock.now += 5000;
  (api.show as (...args: unknown[]) => unknown)({ items: ITEMS });
  assert.deepEqual(idsOf(api.shown[0]), ['new-tab', 'separator', 'close-tab']);
});

test('runs no command on a tab the commands do not apply to', async () => {
  const { api, rightClick, ran, warnings } = setup({ pinned: true });
  rightClick(5);
  (api.show as (...args: unknown[]) => unknown)({ items: ITEMS });
  api.shown[0]?.callback?.('vivarcdi-pin-tab');
  [...api.listeners].forEach((listener) => listener(1, { id: 'vivarcdi-pin-tab' }));
  await settle();
  assert.deepEqual(ran, []);
  assert.equal(warnings.length, 1);
});

test('shows the menu of a tab without waiting', () => {
  const { api, rightClick } = setup();
  rightClick(5);
  assert.equal((api.show as (...args: unknown[]) => unknown)({ items: ITEMS }), 'shown');
  assert.equal(api.shown.length, 1);
});

test('adds nothing and logs once when the items are not as expected', async () => {
  const { api, rightClick, warnings } = setup();
  for (const params of [{ items: 'none' }, { items: [{ x: 1 }] }, undefined]) {
    rightClick(5);
    await (api.show as (...args: unknown[]) => Promise<unknown>)(params);
  }
  assert.equal(warnings.length, 1);
  assert.deepEqual(api.shown.map((shown) => shown.params), [{ items: 'none' }, { items: [{ x: 1 }] }, undefined]);
});

test('restores show on stop', () => {
  const { api, items, original, dom } = setup();
  assert.notEqual(api.show, original);
  items.stop();
  assert.equal(api.show, original);
  assert.equal(api.listeners.size, 0);
  assert.equal([...dom.listeners.values()].flat().length, 0);
});

test('logs and ignores a missing API', () => {
  const withoutMenu = setup({}, null);
  assert.equal(withoutMenu.warnings.length, 1);
  const withoutShow = new FakeMenu();
  withoutShow.show = undefined;
  const second = setup({}, withoutShow);
  assert.equal(second.warnings.length, 1);
  assert.equal(withoutShow.show, undefined);
  second.items.stop();
});
