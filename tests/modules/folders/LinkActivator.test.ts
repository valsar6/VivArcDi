import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LinkActivator } from '../../../src/modules/folders/LinkActivator.js';
import { OpenLinks } from '../../../src/modules/folders/OpenLinks.js';
import { silentLogger } from '../reopen/fakes.js';
import { FolderTabs, immediateFrames } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const MAHJONG_KEY = 'mahjongsoul.game.yo-star.com';

async function setup(tabs: FolderTabs): Promise<LinkActivator> {
  const open = new OpenLinks(tabs, () => undefined, silentLogger(), immediateFrames);
  await open.refresh();
  return new LinkActivator(tabs, open, silentLogger());
}

test('opens a link that has no open tab in a new tab', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  const activator = await setup(tabs);
  await activator.activate({ url: MAHJONG, key: MAHJONG_KEY });
  assert.deepEqual(tabs.actions()[0], ['create', { url: MAHJONG, active: true }]);
  assert.deepEqual(tabs.actions()[1], ['update', 100, { vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  assert.equal(tabs.actions().filter(([name]) => name === 'activate').length, 0);
});

test('switches to the open tab of a clicked link', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: `${MAHJONG}?lang=it` },
  ]);
  const activator = await setup(tabs);
  await activator.activate({ url: MAHJONG, key: MAHJONG_KEY });
  assert.deepEqual(tabs.actions(), [['activate', 2]]);
});

test('loads the open tab of a clicked link again when it is unloaded', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: MAHJONG, discarded: true },
  ]);
  const activator = await setup(tabs);
  await activator.activate({ url: MAHJONG, key: MAHJONG_KEY });
  assert.deepEqual(tabs.actions(), [
    ['activate', 2],
    ['reload', 2],
  ]);
});

test('keeps the new tab where it is when the workspace cannot be written', async () => {
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) }]);
  tabs.failing.add('update');
  const activator = await setup(tabs);
  await activator.activate({ url: MAHJONG, key: MAHJONG_KEY });
  assert.equal(tabs.calls[0]?.[0], 'create');
});
