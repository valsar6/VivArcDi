import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NewTabWatcher } from '../../../src/modules/reopen/NewTabWatcher.js';
import type { NewTabNavigation } from '../../../src/modules/reopen/NewTabWatcher.js';
import { ReopenTabs } from './fakes.js';

function watch(tabs: ReopenTabs): NewTabNavigation[] {
  const navigations: NewTabNavigation[] = [];
  new NewTabWatcher(tabs, (navigation) => navigations.push(navigation)).start();
  return navigations;
}

test('reports the first web navigation of an empty new tab once', () => {
  const tabs = new ReopenTabs();
  const navigations = watch(tabs);
  tabs.create({ id: 5, url: 'chrome://vivaldi-webui/startpage?section=Speed-dials' });
  tabs.emit(5, { url: 'https://example.com/' });
  tabs.emit(5, { url: 'https://example.com/next' });
  assert.deepEqual(
    navigations.map(({ tab, url }) => [tab.id, url]),
    [[5, 'https://example.com/']],
  );
});

test('ignores tabs that did not start empty', () => {
  const tabs = new ReopenTabs();
  const navigations = watch(tabs);
  tabs.create({ id: 6, openerTabId: 1, pendingUrl: '' });
  tabs.create({ id: 7, pendingUrl: 'https://example.com/' });
  tabs.emit(6, { url: 'https://example.com/' });
  tabs.emit(7, { url: 'https://example.com/' });
  assert.deepEqual(navigations, []);
});

test('stops watching a new tab that opens an internal page', () => {
  const tabs = new ReopenTabs();
  const navigations = watch(tabs);
  tabs.create({ id: 8, url: '' });
  tabs.emit(8, { url: 'vivaldi://settings' });
  tabs.emit(8, { url: 'https://example.com/' });
  assert.deepEqual(navigations, []);
});
