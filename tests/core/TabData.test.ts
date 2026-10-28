import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabData } from '../../src/core/TabData.js';

const tabWith = (data: Record<string, unknown>): chrome.tabs.Tab => ({ vivExtData: JSON.stringify(data) }) as unknown as chrome.tabs.Tab;
const parsed = (text: string): Record<string, unknown> => JSON.parse(text) as Record<string, unknown>;

test('ownOf reads the bookmarkId of a tab', () => {
  assert.deepEqual(TabData.ownOf(tabWith({ vivarcdi: { bookmarkId: '11' } })), { bookmarkId: '11' });
});

test('ownOf ignores a bookmarkId that is not a string', () => {
  assert.deepEqual(TabData.ownOf(tabWith({ vivarcdi: { bookmarkId: 11 } })), {});
  assert.deepEqual(TabData.ownOf(tabWith({ vivarcdi: { bookmarkId: null } })), {});
});

test('withOwn sets the bookmarkId and keeps Vivaldi keys and other own keys', () => {
  const tab = tabWith({ workspaceId: 7, vivarcdi: { favoriteId: '5' } });
  const written = parsed(TabData.withOwn(tab, { bookmarkId: '11' }));
  assert.equal(written['workspaceId'], 7);
  assert.deepEqual(written['vivarcdi'], { favoriteId: '5', bookmarkId: '11' });
});

test('withOwn removes the bookmarkId and keeps Vivaldi keys and other own keys', () => {
  const tab = tabWith({ workspaceId: 7, vivarcdi: { bookmarkId: '11', lastActive: 100 } });
  const written = parsed(TabData.withOwn(tab, { bookmarkId: undefined }));
  assert.equal(written['workspaceId'], 7);
  assert.deepEqual(written['vivarcdi'], { lastActive: 100 });
});

test('withOwn drops the own key when no value is left', () => {
  const tab = tabWith({ workspaceId: 7, vivarcdi: { bookmarkId: '11' } });
  const written = parsed(TabData.withOwn(tab, { bookmarkId: undefined }));
  assert.deepEqual(written, { workspaceId: 7 });
  assert.equal('vivarcdi' in written, false);
});
