import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KeptTab } from '../../src/core/KeptTab.js';

const tabWith = (fields: Record<string, unknown>): chrome.tabs.Tab => fields as unknown as chrome.tabs.Tab;
const ownData = (own: Record<string, unknown>): string => JSON.stringify({ workspaceId: 7, vivarcdi: own });

test('a pinned tab is a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ pinned: true })), true);
});

test('a tab linked to a Favorite by its own favoriteId is a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ pinned: false, vivExtData: ownData({ favoriteId: '5' }) })), true);
});

test('a tab that stands for a bookmark by its own bookmarkId is a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ pinned: false, vivExtData: ownData({ bookmarkId: '11' }) })), true);
});

test('a plain tab is not a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ pinned: false })), false);
  assert.equal(KeptTab.is(tabWith({})), false);
});

test('a tab with only other own values is not a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ vivExtData: ownData({ pinnedUrl: 'https://a.example/', lastActive: 100 }) })), false);
});

test('a tab with a non-string bookmarkId is not a kept tab', () => {
  assert.equal(KeptTab.is(tabWith({ vivExtData: ownData({ bookmarkId: 11, favoriteId: null }) })), false);
});

test('a tab with malformed vivExtData is not a kept tab unless it is pinned', () => {
  assert.equal(KeptTab.is(tabWith({ vivExtData: '{not json' })), false);
  assert.equal(KeptTab.is(tabWith({ vivExtData: '[1,2]' })), false);
  assert.equal(KeptTab.is(tabWith({ pinned: true, vivExtData: '{not json' })), true);
});
