import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PinnedPageLoader } from '../../../src/modules/pinned/PinnedPageLoader.js';
import { PinWatcher } from '../../../src/modules/pinned/PinWatcher.js';
import { SavedAddresses } from '../../../src/modules/pinned/SavedAddresses.js';
import { LinkingTabs, own, silentLogger } from '../favorites/linked.js';

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const activate = (tabs: LinkingTabs, tabId: number): void => {
  tabs.activated.forEach((listener) => listener({ tabId, windowId: 1 }));
};

const complete = (tabs: LinkingTabs, tabId: number, url: string): void => {
  const tab = { ...tabs.tabs.get(tabId), id: tabId, url } as chrome.tabs.Tab;
  tabs.updated.forEach((listener) => listener(tabId, { status: 'complete' }, tab));
};

const updates = (tabs: LinkingTabs): Array<[number, unknown]> =>
  tabs
    .actions()
    .filter(([name]) => name === 'update')
    .map(([, tabId, change]) => [tabId as number, change]);

test('keeps the pinned page when a pinned tab navigates', async () => {
  const tabs = new LinkingTabs([
    { id: 2, pinned: true, url: 'https://docs.example/a', vivExtData: own({}, undefined, 'https://docs.example/a') },
  ]);
  const watcher = new PinWatcher(tabs, new SavedAddresses(tabs), silentLogger);
  await watcher.start();
  const loader = new PinnedPageLoader(tabs, silentLogger);
  await loader.start();
  tabs.navigate(2, 'https://docs.example/b');
  await settle();
  assert.deepEqual(tabs.extData(2), { vivarcdi: { pinnedUrl: 'https://docs.example/a' } });
  assert.deepEqual(updates(tabs), []);
  loader.stop();
  watcher.stop();
});

test('loads the pinned page when an unloaded pinned tab opens', async () => {
  const home = 'https://www.reddit.com/';
  const tabs = new LinkingTabs([
    { id: 2, pinned: true, discarded: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({}, undefined, home) },
    { id: 3, active: true, url: 'https://news.example/' },
  ]);
  const loader = new PinnedPageLoader(tabs, silentLogger);
  await loader.start();
  assert.deepEqual(updates(tabs), []);
  activate(tabs, 2);
  await settle();
  assert.deepEqual(updates(tabs), [[2, { url: home }]]);
  tabs.navigate(2, 'https://www.reddit.com/r/vivaldi');
  complete(tabs, 2, 'https://www.reddit.com/r/vivaldi');
  await settle();
  assert.deepEqual(updates(tabs).at(-1), [2, { url: home }]);
  const count = updates(tabs).length;
  tabs.navigate(2, 'https://docs.example/c');
  await settle();
  assert.equal(updates(tabs).length, count);
  loader.stop();
});

test('loads the pinned page of the active tab at start', async () => {
  const home = 'https://www.reddit.com/';
  const tabs = new LinkingTabs([
    { id: 2, active: true, pinned: true, discarded: true, url: 'https://www.reddit.com/r/vivaldi', vivExtData: own({}, undefined, home) },
  ]);
  const loader = new PinnedPageLoader(tabs, silentLogger);
  await loader.start();
  assert.deepEqual(updates(tabs), [[2, { url: home }]]);
  loader.stop();
});

test('leaves a pinned tab without its own page alone', async () => {
  const tabs = new LinkingTabs([{ id: 2, active: true, pinned: true, discarded: true, url: 'vivaldi://settings' }]);
  const loader = new PinnedPageLoader(tabs, silentLogger);
  await loader.start();
  activate(tabs, 2);
  await settle();
  assert.deepEqual(updates(tabs), []);
  loader.stop();
});
