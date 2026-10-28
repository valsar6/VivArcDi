import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TodayTabPolicy } from '../../../src/modules/today/TodayTabPolicy.js';

const tabWith = (fields: Record<string, unknown>): chrome.tabs.Tab =>
  ({ url: 'https://a.example/', active: false, pinned: false, ...fields }) as unknown as chrome.tabs.Tab;
const ownData = (own: Record<string, unknown>): string => JSON.stringify({ vivarcdi: own });

test('a plain inactive web tab is archivable', () => {
  assert.equal(TodayTabPolicy.isArchivable(tabWith({})), true);
});

test('a pinned tab is not archivable', () => {
  assert.equal(TodayTabPolicy.isArchivable(tabWith({ pinned: true })), false);
});

test('the tab of a Favorite is not archivable', () => {
  assert.equal(TodayTabPolicy.isArchivable(tabWith({ vivExtData: ownData({ favoriteId: '5' }) })), false);
});

test('the tab of a bookmark link is not archivable', () => {
  assert.equal(TodayTabPolicy.isArchivable(tabWith({ vivExtData: ownData({ bookmarkId: '11' }) })), false);
});
