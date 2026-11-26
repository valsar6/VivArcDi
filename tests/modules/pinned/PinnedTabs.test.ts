import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { CloseShortcut } from '../../../src/modules/pinned/CloseShortcut.js';
import { PINNED_MINUS_ATTRIBUTE, PINNED_UNLOAD_ATTRIBUTE, PinnedMinus } from '../../../src/modules/pinned/PinnedMinus.js';
import { PinWatcher } from '../../../src/modules/pinned/PinWatcher.js';
import { SavedAddresses } from '../../../src/modules/pinned/SavedAddresses.js';
import { immediateFrames } from '../folders/fakes.js';
import { LinkingTabs, own, silentLogger } from '../favorites/linked.js';
import { event, ListeningDocument, MinusDocument, MinusNode, row } from './fakes.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const minusSelectors = new SelectorCatalog(
  { browser: '[data-browser]', pinnedTab: 'pinned', tabWrapper: '[data-slot]', tabFavicon: 'favicon' },
  'test',
);

const pin = (tabs: LinkingTabs, tabId: number, pinned: boolean): void => {
  const tab = { ...tabs.tabs.get(tabId), pinned } as chrome.tabs.Tab;
  tabs.tabs.set(tabId, { ...tab, id: tabId });
  tabs.updated.forEach((listener) => listener(tabId, { pinned }, tab));
};

const watch = async (tabs: LinkingTabs): Promise<PinWatcher> => {
  const watcher = new PinWatcher(tabs, new SavedAddresses(tabs), silentLogger);
  await watcher.start();
  return watcher;
};

const closeShortcut = (document: ListeningDocument, activePinned: number | null, unloaded: number[]): CloseShortcut => {
  const shortcut = new CloseShortcut({
    document: document as unknown as Document,
    closeSelector: 'close',
    pinnedSelector: 'pinned',
    wrapperSelector: 'wrapper',
    activePinned: (): number | null => activePinned,
    unload: (tabId): number => unloaded.push(tabId),
  });
  shortcut.attach();
  return shortcut;
};

test('saves the address of a newly pinned tab', async () => {
  const tabs = new LinkingTabs([{ id: 4, pinned: false, url: 'https://mail.example/inbox', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  await watch(tabs);
  pin(tabs, 4, true);
  await settle();
  assert.deepEqual(tabs.extData(4), { workspaceId: 7, vivarcdi: { pinnedUrl: 'https://mail.example/inbox' } });
});

test('saves the address of a pinned tab seen for the first time', async () => {
  const tabs = new LinkingTabs([
    { id: 1, pinned: true, url: 'https://docs.example/a' },
    { id: 2, pinned: true, url: 'https://docs.example/b', vivExtData: own({}, undefined, 'https://docs.example/home') },
    { id: 3, pinned: true, url: 'vivaldi://settings' },
    { id: 4, pinned: false, url: 'https://news.example/' },
  ]);
  await watch(tabs);
  assert.deepEqual(tabs.extData(1), { vivarcdi: { pinnedUrl: 'https://docs.example/a' } });
  assert.deepEqual(tabs.extData(2), { vivarcdi: { pinnedUrl: 'https://docs.example/home' } });
  assert.deepEqual(tabs.extData(3), {});
  assert.deepEqual(tabs.extData(4), {});
});

test('does not save the own page of a tab pinned in another window', async () => {
  const tabs = new LinkingTabs([{ id: 4, windowId: 2, pinned: false, url: 'https://mail.example/inbox' }]);
  await watch(tabs);
  pin(tabs, 4, true);
  await settle();
  assert.deepEqual(tabs.extData(4), {});
  assert.deepEqual(tabs.actions().filter(([name]) => name === 'update'), []);
});

test('does not forget the own page of a tab unpinned in another window', async () => {
  const data = own({ workspaceId: 7 }, 'w', 'https://web.whatsapp.com/');
  const tabs = new LinkingTabs([{ id: 2, windowId: 2, pinned: true, url: 'https://web.whatsapp.com/', vivExtData: data }]);
  await watch(tabs);
  pin(tabs, 2, false);
  await settle();
  assert.deepEqual(tabs.extData(2), JSON.parse(data));
});

test('saves at start only the pinned tabs of its own window', async () => {
  const tabs = new LinkingTabs([
    { id: 1, pinned: true, url: 'https://docs.example/a' },
    { id: 2, windowId: 2, pinned: true, url: 'https://docs.example/b' },
  ]);
  await watch(tabs);
  assert.deepEqual(tabs.extData(1), { vivarcdi: { pinnedUrl: 'https://docs.example/a' } });
  assert.deepEqual(tabs.extData(2), {});
});

test('forgets the address of an unpinned tab', async () => {
  const tabs = new LinkingTabs([{ id: 2, pinned: true, url: 'https://web.whatsapp.com/', vivExtData: own({ workspaceId: 7 }, 'w', 'https://web.whatsapp.com/') }]);
  const watcher = await watch(tabs);
  pin(tabs, 2, false);
  await settle();
  assert.deepEqual(tabs.extData(2), { workspaceId: 7 });
  watcher.stop();
  assert.equal(tabs.updated.size, 0);
});

test('unloads a pinned tab on close shortcut', () => {
  const document = new ListeningDocument();
  const unloaded: number[] = [];
  const shortcut = closeShortcut(document, 2, unloaded);
  const keyMac = document.dispatch(event('keydown', { key: 'w', metaKey: true }));
  const keyOther = document.dispatch(event('keydown', { key: 'W', ctrlKey: true }));
  const pinnedRow = row(5, true);
  const click = document.dispatch(event('click', { target: { closest: (selector: string) => (selector === 'close' ? pinnedRow.close : null) } }));
  assert.deepEqual(unloaded, [2, 2, 5]);
  assert.ok([keyMac, keyOther, click].every((fake) => fake.defaultPrevented && fake.stopped));
  shortcut.detach();
  assert.equal(document.count(), 0);
});

test('unloads a pinned tab from its minus', async () => {
  const document = new MinusDocument();
  const pinned = document.addRow(5);
  const tabs = new LinkingTabs([
    { id: 5, url: 'https://docs.example/a' },
    { id: 6, active: true, url: 'https://news.example/' },
  ]);
  const watchers = new Set<() => void>();
  const minus = new PinnedMinus({
    document: document as unknown as Document,
    selectors: minusSelectors,
    tabs,
    logger: silentLogger,
    watch: (_target, onChange): (() => void) => {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    timing: immediateFrames,
  });
  minus.start();
  await settle();
  assert.ok(document.browser.hasAttribute(PINNED_UNLOAD_ATTRIBUTE));
  const button = pinned.querySelector(`[${PINNED_MINUS_ATTRIBUTE}]`);
  assert.ok(button instanceof MinusNode);
  const down = document.dispatch(event('mousedown', { target: button }));
  const pointerDown = document.dispatch(event('pointerdown', { target: button }));
  const click = document.dispatch(event('click', { target: button }));
  await settle();
  assert.ok(down.defaultPrevented && down.stopped);
  assert.ok(pointerDown.defaultPrevented && pointerDown.stopped);
  assert.ok(click.defaultPrevented && click.stopped);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'discard'), [['discard', 5]]);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), []);
  minus.stop();
  assert.equal(document.browser.hasAttribute(PINNED_UNLOAD_ATTRIBUTE), false);
  assert.equal(button.parentElement, null);
  assert.equal(watchers.size, 0);
});

test('unloads a pinned tab from its minus in a group beside the tab strip', async () => {
  const document = new MinusDocument();
  const pinned = document.addGroupRow(5);
  const tabs = new LinkingTabs([
    { id: 5, url: 'https://docs.example/a' },
    { id: 6, active: true, url: 'https://news.example/' },
  ]);
  const watchers = new Set<() => void>();
  const minus = new PinnedMinus({
    document: document as unknown as Document,
    selectors: minusSelectors,
    tabs,
    logger: silentLogger,
    watch: (_target, onChange): (() => void) => {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    timing: immediateFrames,
  });
  minus.start();
  await settle();
  assert.ok(document.browser.hasAttribute(PINNED_UNLOAD_ATTRIBUTE));
  const button = pinned.querySelector(`[${PINNED_MINUS_ATTRIBUTE}]`);
  assert.ok(button instanceof MinusNode);
  const down = document.dispatch(event('mousedown', { target: button }));
  const pointerDown = document.dispatch(event('pointerdown', { target: button }));
  const click = document.dispatch(event('click', { target: button }));
  await settle();
  assert.ok(down.defaultPrevented && down.stopped);
  assert.ok(pointerDown.defaultPrevented && pointerDown.stopped);
  assert.ok(click.defaultPrevented && click.stopped);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'discard'), [['discard', 5]]);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), []);
  minus.stop();
  assert.equal(document.browser.hasAttribute(PINNED_UNLOAD_ATTRIBUTE), false);
  assert.equal(button.parentElement, null);
  assert.equal(watchers.size, 0);
});

test('keeps the pinned minus unloading', async () => {
  const document = new MinusDocument();
  const pinned = document.addRow(5);
  const tabs = new LinkingTabs([
    { id: 5, url: 'https://docs.example/a' },
    { id: 6, active: true, url: 'https://news.example/' },
  ]);
  const minus = new PinnedMinus({
    document: document as unknown as Document,
    selectors: minusSelectors,
    tabs,
    logger: silentLogger,
    watch: (_target): (() => void) => (): void => undefined,
    timing: immediateFrames,
  });
  minus.start();
  await settle();
  const button = pinned.querySelector(`[${PINNED_MINUS_ATTRIBUTE}]`);
  assert.ok(button instanceof MinusNode);
  const click = document.dispatch(event('click', { target: button }));
  await settle();
  assert.ok(click.defaultPrevented && click.stopped);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'discard'), [['discard', 5]]);
  assert.deepEqual(tabs.calls.filter(([name]) => name === 'remove'), []);
  minus.stop();
});

test('labels the pinned minus as Unload tab', async () => {
  const document = new MinusDocument();
  const pinned = document.addRow(5);
  const watchers = new Set<() => void>();
  const minus = new PinnedMinus({
    document: document as unknown as Document,
    selectors: minusSelectors,
    tabs: new LinkingTabs([{ id: 5, url: 'https://docs.example/a' }]),
    logger: silentLogger,
    watch: (_target, onChange): (() => void) => {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    timing: immediateFrames,
  });
  minus.start();
  await settle();
  const button = pinned.querySelector(`[${PINNED_MINUS_ATTRIBUTE}]`);
  assert.ok(button instanceof MinusNode);
  assert.equal(button.getAttribute('aria-label'), 'Unload tab');
  minus.stop();
});

test('does not start a drag from the pinned row minus', async () => {
  const document = new MinusDocument();
  const pinned = document.addRow(5);
  const watchers = new Set<() => void>();
  const minus = new PinnedMinus({
    document: document as unknown as Document,
    selectors: minusSelectors,
    tabs: new LinkingTabs([{ id: 5, url: 'https://docs.example/a' }]),
    logger: silentLogger,
    watch: (_target, onChange): (() => void) => {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    timing: immediateFrames,
  });
  minus.start();
  await settle();
  const button = pinned.querySelector(`[${PINNED_MINUS_ATTRIBUTE}]`);
  assert.ok(button instanceof MinusNode);
  const pointerDown = document.dispatch(event('pointerdown', { target: button }));
  const mouseDown = document.dispatch(event('mousedown', { target: button }));
  assert.ok(pointerDown.defaultPrevented && pointerDown.stopped);
  assert.ok(mouseDown.defaultPrevented && mouseDown.stopped);
  minus.stop();
});

test('leaves the close shortcut to Vivaldi for ordinary tabs', () => {
  const document = new ListeningDocument();
  const unloaded: number[] = [];
  closeShortcut(document, null, unloaded);
  const ordinary = document.dispatch(event('keydown', { key: 'w', metaKey: true }));
  const plainRow = row(6, false);
  const click = document.dispatch(event('click', { target: { closest: (selector: string) => (selector === 'close' ? plainRow.close : null) } }));
  const pinnedDocument = new ListeningDocument();
  closeShortcut(pinnedDocument, 2, unloaded);
  const shifted = pinnedDocument.dispatch(event('keydown', { key: 'w', metaKey: true, shiftKey: true }));
  const taken = pinnedDocument.dispatch(event('keydown', { key: 'w', metaKey: true, defaultPrevented: true }));
  const plainW = pinnedDocument.dispatch(event('keydown', { key: 'w' }));
  assert.deepEqual(unloaded, []);
  assert.ok([ordinary, click, shifted, plainW].every((fake) => !fake.defaultPrevented && !fake.stopped));
  assert.equal(taken.stopped, false);
});
