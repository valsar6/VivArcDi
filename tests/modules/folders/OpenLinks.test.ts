import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenLinks } from '../../../src/modules/folders/OpenLinks.js';
import { silentLogger } from '../reopen/fakes.js';
import { FolderTabs, immediateFrames } from './fakes.js';

const MAHJONG = { id: '11', key: 'mahjongsoul.game.yo-star.com' };
const JIRA = { id: '12', key: 'jira.example.com' };
const linkedTo = (bookmarkId: string, workspaceId = 7): string => JSON.stringify({ workspaceId, vivarcdi: { bookmarkId } });
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

async function start(tabs: FolderTabs): Promise<{ links: OpenLinks; changes: () => number }> {
  let changes = 0;
  const links = new OpenLinks(tabs, () => (changes += 1), silentLogger(), immediateFrames);
  await links.start();
  return { links, changes: () => changes };
}

test('keeps the tab of a link while it navigates away', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, url: `https://${MAHJONG.key}/`, title: 'Mahjong', vivExtData: linkedTo('11') },
  ]);
  const { links, changes } = await start(tabs);
  assert.equal(links.tabFor(MAHJONG)?.tabId, 2);

  const before = changes();
  tabs.navigate(2, 'https://id.atlassian.com/login');
  await settle();
  assert.equal(links.tabFor(MAHJONG)?.tabId, 2);
  assert.equal(links.tabFor(MAHJONG)?.key, 'id.atlassian.com/login');
  assert.equal(links.tabFor({ id: '99', key: 'id.atlassian.com/login' }), undefined);
  assert.ok(changes() > before);
  links.stop();
});

test('matches by address only the tabs that are not linked', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, url: `https://${MAHJONG.key}/`, vivExtData: linkedTo('99') },
    { id: 3, url: `https://${JIRA.key}/board`, vivExtData: JSON.stringify({ workspaceId: 7 }) },
  ]);
  const { links } = await start(tabs);
  assert.equal(links.tabFor(MAHJONG), undefined);
  assert.equal(links.tabFor({ id: JIRA.id, key: `${JIRA.key}/board` })?.tabId, 3);
  links.stop();
});

test('ignores the tab of a link that belongs to another workspace', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/', vivExtData: JSON.stringify({ workspaceId: 7 }) },
    { id: 2, url: `https://${MAHJONG.key}/`, vivExtData: linkedTo('11', 8) },
  ]);
  const { links } = await start(tabs);
  assert.equal(links.tabFor(MAHJONG), undefined);
  assert.deepEqual(links.linkedTabIds, [2]);
  links.stop();
});

test('shows the state of the tab of a link', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: `https://${MAHJONG.key}/`, title: 'Mahjong', favIconUrl: 'icon.png', vivExtData: linkedTo('11') },
    { id: 2, discarded: true, url: `https://${JIRA.key}/`, vivExtData: linkedTo('12') },
  ]);
  const { links } = await start(tabs);
  assert.deepEqual(links.tabFor(MAHJONG), { tabId: 1, title: 'Mahjong', key: MAHJONG.key, favIconUrl: 'icon.png', active: true, unloaded: false });
  assert.equal(links.tabFor(JIRA)?.unloaded, true);
  links.stop();
});

test('lets go of the tab of a link when the tab closes', async () => {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: `https://${MAHJONG.key}/`, vivExtData: linkedTo('11', 7) },
  ]);
  const { links } = await start(tabs);
  tabs.close(2);
  await settle();
  assert.equal(links.tabFor(MAHJONG), undefined);
  assert.deepEqual(links.linkedTabIds, []);
  links.stop();
  assert.equal(tabs.listenerCount(), 0);
});
