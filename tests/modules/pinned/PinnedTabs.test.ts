import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabUnloader } from '../../../src/core/TabUnloader.js';
import { FavoriteOpener } from '../../../src/modules/favorites/FavoriteOpener.js';
import { LinkedTabs } from '../../../src/modules/favorites/LinkedTabs.js';
import { AwayTabs } from '../../../src/modules/pinned/AwayTabs.js';
import { CloseShortcut } from '../../../src/modules/pinned/CloseShortcut.js';
import { PinWatcher } from '../../../src/modules/pinned/PinWatcher.js';
import { ResetClick } from '../../../src/modules/pinned/ResetClick.js';
import { SavedAddresses } from '../../../src/modules/pinned/SavedAddresses.js';
import { AWAY_ATTRIBUTE, PINNED_LAST_ATTRIBUTE, TabBarMarker } from '../../../src/modules/pinned/TabBarMarker.js';
import { FakeNode, selectors } from '../favorites/fakes.js';
import { LinkingTabs, own, silentLogger } from '../favorites/linked.js';
import { event, ListeningDocument, row } from './fakes.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

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

test('forgets the address of an unpinned tab', async () => {
  const tabs = new LinkingTabs([{ id: 2, pinned: true, url: 'https://web.whatsapp.com/', vivExtData: own({ workspaceId: 7 }, 'w', 'https://web.whatsapp.com/') }]);
  const watcher = await watch(tabs);
  pin(tabs, 2, false);
  await settle();
  assert.deepEqual(tabs.extData(2), { workspaceId: 7 });
  watcher.stop();
  assert.equal(tabs.updated.size, 0);
});

test('marks favorites and pinned tabs that left their own page', () => {
  const marks = AwayTabs.marksOf([
    { id: 1, pinned: true, url: 'https://web.whatsapp.com/', vivExtData: own({}, 'w', 'https://web.whatsapp.com/') },
    { id: 2, pinned: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({}, 'r', 'https://www.reddit.com/') },
    { id: 3, pinned: true, url: 'https://docs.example/b', vivExtData: own({}, undefined, 'https://docs.example/a') },
    { id: 4, pinned: true, url: 'https://docs.example/a?tab=2#top', vivExtData: own({}, undefined, 'https://docs.example/a') },
    { id: 5, pinned: false, url: 'https://news.example/', vivExtData: own({}, undefined, 'https://docs.example/a') },
  ] as unknown as chrome.tabs.Tab[]);
  assert.deepEqual([...marks.away], [2, 3]);
  assert.deepEqual([...marks.linked], [1, 2]);

  const slot = (id: number, pinned: boolean): FakeNode => {
    const wrapper = new FakeNode(['wrapper']);
    wrapper.dataset['id'] = `tab-${id}`;
    return new FakeNode(pinned ? ['pinned'] : [], [wrapper]);
  };
  const slots = [slot(1, true), slot(2, true), slot(3, true), slot(4, true), slot(5, false)];
  const document = new FakeNode([], [new FakeNode(['strip'], slots)]);
  const marker = new TabBarMarker(selectors);
  marker.apply(document as unknown as ParentNode, marks);
  assert.deepEqual(slots.map((node) => node.hasAttribute(AWAY_ATTRIBUTE)), [false, true, true, false, false]);
  assert.deepEqual(slots.map((node) => node.hasAttribute(PINNED_LAST_ATTRIBUTE)), [false, false, false, true, false]);
  marker.clear();
  assert.ok(slots.every((node) => !node.hasAttribute(AWAY_ATTRIBUTE) && !node.hasAttribute(PINNED_LAST_ATTRIBUTE)));
});

test('loads the own page on reset', async () => {
  const reddit = { id: 'r', title: 'Reddit', url: 'https://www.reddit.com/' };
  const tabs = new LinkingTabs([
    { id: 2, active: true, pinned: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({}, 'r', reddit.url) },
    { id: 3, pinned: true, url: 'https://docs.example/b', vivExtData: own({}, undefined, 'https://docs.example/a') },
    { id: 4, pinned: true, url: 'https://docs.example/a', vivExtData: own({}, undefined, 'https://docs.example/a') },
  ]);
  await new FavoriteOpener(tabs, new LinkedTabs(tabs), new TabUnloader(tabs), silentLogger).open(reddit);
  const addresses = new SavedAddresses(tabs);
  const document = new ListeningDocument();
  const reset = new ResetClick({
    document: document as unknown as Document,
    faviconSelector: 'favicon',
    wrapperSelector: 'wrapper',
    isAway: (tabId): boolean => tabId === 3,
    reset: (tabId): void => void addresses.load(tabId),
  });
  reset.attach();
  const away = row(3, true);
  const click = document.dispatch(event('click', { target: { closest: (selector: string) => (selector === 'favicon' ? away.favicon : null) } }));
  const home = row(4, true);
  const ignored = document.dispatch(event('click', { target: { closest: (selector: string) => (selector === 'favicon' ? home.favicon : null) } }));
  await settle();
  await addresses.load(4);
  assert.deepEqual(
    tabs.actions().filter(([name]) => name === 'update').map(([, tabId, change]) => [tabId, change]),
    [
      [2, { url: reddit.url }],
      [3, { url: 'https://docs.example/a' }],
    ],
  );
  assert.deepEqual([click.defaultPrevented, ignored.defaultPrevented], [true, false]);
  reset.detach();
  assert.equal(document.count(), 0);
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
