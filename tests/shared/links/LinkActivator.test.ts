import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkActivator } from '../../../src/modules/folders/LinkActivator.js';
import { OpenLinks } from '../../../src/modules/folders/OpenLinks.js';
import { silentLogger } from '../reopen/fakes.js';
import { FolderTabs, immediateFrames } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const MAHJONG_KEY = 'mahjongsoul.game.yo-star.com';
const MAHJONG_LINK = { id: '11', url: MAHJONG, key: MAHJONG_KEY };
const linkedTo = (bookmarkId: string, workspaceId?: number): string => JSON.stringify({ ...(workspaceId === undefined ? {} : { workspaceId }), vivarcdi: { bookmarkId } });

async function setup(tabs: FolderTabs): Promise<LinkActivator> {
  const open = new OpenLinks(tabs, () => undefined, silentLogger(), immediateFrames);
  await open.refresh();
  return new LinkActivator(tabs, open, silentLogger());
}

test('opens a link that has no open tab in a new tab', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions()[0], ['create', { url: MAHJONG, active: true }]);
  assert.equal(tabs.actions()[1]?.[0], 'update');
  assert.equal(tabs.actions().filter(([name]) => name === 'activate').length, 0);
});

test('links the tab opened from a link to its bookmark', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  const updates = tabs.actions().filter(([name]) => name === 'update');
  assert.deepEqual(updates, [['update', 100, { vivExtData: linkedTo('11', 7) }]]);
});

test('switches to the open tab of a clicked link', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: `${MAHJONG}?lang=it` },
  ]);
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions(), [['activate', 2]]);
});

test('switches to the linked tab of a clicked link even when it shows another page', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: 'https://id.atlassian.com/login', vivExtData: linkedTo('11') },
  ]);
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions(), [['activate', 2]]);
});

test('closes the tab of a link', async () => {
  const tabs = new FolderTabs([{ id: 2, url: MAHJONG, vivExtData: linkedTo('11') }]);
  const activator = await setup(tabs);
  await activator.close(2);
  assert.deepEqual(tabs.actions(), [['remove', 2]]);
});

test('loads the open tab of a clicked link again when it is unloaded', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: MAHJONG, discarded: true },
  ]);
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions(), [
    ['activate', 2],
    ['reload', 2],
  ]);
});

test('keeps the new tab where it is when the workspace cannot be written', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  tabs.failing.add('update');
  const activator = await setup(tabs);
  await activator.activate(MAHJONG_LINK);
  assert.equal(tabs.calls[0]?.[0], 'create');
});

test('looks for the tab of a link only in the active workspace', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, url: MAHJONG, vivExtData: linkedTo('11', 8) },
  ]);
  const open = new OpenLinks(tabs, () => undefined, silentLogger(), immediateFrames);
  const activator = new LinkActivator(tabs, open, silentLogger());
  await open.refresh();
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions()[0], ['create', { url: MAHJONG, active: true }]);
  assert.deepEqual(tabs.actions()[1], ['update', 100, { vivExtData: linkedTo('11', 7) }]);
  assert.equal(tabs.actions().filter(([name]) => name === 'activate').length, 0);

  tabs.tabs.set(1, { ...tabs.tabs.get(1), active: false } as never);
  tabs.tabs.set(2, { ...tabs.tabs.get(2), active: true } as never);
  tabs.calls.length = 0;
  await open.refresh();
  await activator.activate(MAHJONG_LINK);
  assert.deepEqual(tabs.actions(), [['activate', 2]]);
});
