import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookmarkNode } from '../../../src/core/browser/bookmarks/BookmarkNode.js';
import { LabelKeys, LinkLabels } from '../../../src/core/browser/LinkLabels.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { LabelSync } from '../../../src/modules/workspacesync/LabelSync.js';
import type { LabelSyncParts } from '../../../src/modules/workspacesync/LabelSync.js';
import { WorkspaceSettings } from '../../../src/modules/workspacesync/WorkspaceSettings.js';
import { folder, link } from '../folders/fakes.js';
import { pinnedTab, world } from './fakes.js';
import type { World } from './fakes.js';

const BASE = ['VivArcDi'];
const FAVORITES = ['Favorites'];

const withUuid = (id: string, title: string, uuid?: string): BookmarkNode => ({ ...link(id, title, `https://${title}.example/`), ...(uuid === undefined ? {} : { uuid }) });

const nodeOf = (nodes: BookmarkNode[], id: string): BookmarkNode | undefined =>
  nodes.flatMap((node) => (node.id === id ? [node] : (nodeOf(node.children ?? [], id) ?? []))).at(0);

interface Setup {
  setup: World;
  labels: LinkLabels;
  sync: LabelSync;
  settings: WorkspaceSettings;
  updates: () => number;
}

const setupOf = (parts: Partial<LabelSyncParts> = {}, tabs = [pinnedTab(1, 'mail')]): Setup => {
  const setup = world({ tabs });
  setup.chrome.tree.push(
    folder('70', 'VivArcDi', [
      folder('71', 'Casetta', [withUuid('11', 'row', 'u-11'), withUuid('12', 'nouuid')]),
      folder('73', 'Tabs', [withUuid('13', 'loose', 'u-13')]),
      withUuid('14', 'base', 'u-14'),
    ]),
    folder('72', 'Favorites', [withUuid('21', 'tile', 'u-21')]),
    folder('74', 'Elsewhere', [withUuid('31', 'away', 'u-31')]),
  );
  const logger = new Logger('test', setup.sink);
  const labels = LinkLabels.of(setup.storage, logger);
  const settings = new WorkspaceSettings(setup.store, logger);
  const sync = new LabelSync({ labels, settings, bookmarks: setup.chrome.reader, tabs: setup.tabs, names: setup.names, folders: { base: BASE, favorites: FAVORITES }, logger, ...parts });
  sync.start();
  return { setup, labels, sync, settings, updates: (): number => setup.chrome.calls.filter((call) => call.startsWith('update')).length };
};

test('syncs the name of a saved tab', async () => {
  const { labels, sync, settings } = setupOf();
  await labels.set(LabelKeys.bookmark('11'), { name: 'Posta' });
  await sync.settled();
  assert.equal(await settings.get('Casetta', 'name:uuid:u-11'), 'Posta');
  assert.equal(await settings.get(null, 'name:uuid:u-11'), undefined);
});

test('syncs the name of a Favorites tile outside any workspace', async () => {
  const { labels, sync, settings } = setupOf();
  await labels.set(LabelKeys.bookmark('21'), { name: 'Casa' });
  await labels.set(LabelKeys.bookmark('13'), { name: 'Sciolto' });
  await labels.set(LabelKeys.bookmark('14'), { name: 'Base' });
  await sync.settled();
  assert.equal(await settings.get(null, 'name:uuid:u-21'), 'Casa');
  assert.equal(await settings.get(null, 'name:uuid:u-13'), 'Sciolto');
  assert.equal(await settings.get(null, 'name:uuid:u-14'), 'Base');
});

test('syncs the name of a tile made from a pinned tab in its workspace', async () => {
  const { setup, labels, sync, settings } = setupOf();
  const key = LabelKeys.page(setup.tabs.tabs.get(1) as chrome.tabs.Tab) as string;
  assert.equal(key, 'page:mail.example');
  await labels.set(key, { name: 'Lettere' });
  await sync.settled();
  assert.equal(await settings.get('Casetta', 'name:page:mail.example'), 'Lettere');
});

test('applies a name of the store to the label of the bookmark with that uuid', async () => {
  const { labels, sync, settings } = setupOf();
  await settings.set('Casetta', 'name:uuid:u-11', 'Posta');
  await settings.set(null, 'name:uuid:u-21', 'Casa');
  await sync.apply();
  assert.equal(labels.get(LabelKeys.bookmark('11'))?.name, 'Posta');
  assert.equal(labels.get(LabelKeys.bookmark('21'))?.name, 'Casa');
});

test('applies a name of the store to the labels with that address key', async () => {
  const { labels, sync, settings } = setupOf();
  await settings.set('Casetta', 'name:page:mail.example', 'Lettere');
  await sync.apply();
  assert.equal(labels.get('page:mail.example')?.name, 'Lettere');
});

test('ignores a name stored in another area than the one of its bookmark', async () => {
  const { labels, sync, settings } = setupOf();
  await settings.set(null, 'name:uuid:u-11', 'Posta');
  await settings.set('Casetta', 'name:uuid:unknown', 'Nessuno');
  await sync.apply();
  assert.deepEqual([...labels.all().keys()], []);
});

test('removes the name when the store holds null', async () => {
  const { labels, sync, settings } = setupOf();
  await labels.set(LabelKeys.bookmark('11'), { name: 'Posta', icon: { emoji: '📧' } });
  await sync.settled();
  await settings.set('Casetta', 'name:uuid:u-11', null);
  await sync.apply();
  assert.deepEqual(labels.get(LabelKeys.bookmark('11')), { icon: { emoji: '📧' } });
});

test('writes null when the name is removed here', async () => {
  const { labels, sync, settings } = setupOf();
  await labels.set(LabelKeys.bookmark('11'), { name: 'Posta' });
  await sync.settled();
  await labels.clear(LabelKeys.bookmark('11'));
  await sync.settled();
  assert.equal(await settings.get('Casetta', 'name:uuid:u-11'), null);
});

test('does not write back a name applied by the sync', async () => {
  const { setup, labels, sync, settings, updates } = setupOf();
  await settings.set('Casetta', 'name:uuid:u-11', 'Posta');
  const before = updates();
  const calls = setup.chrome.calls.length;
  await sync.apply();
  await sync.settled();
  assert.equal(labels.get(LabelKeys.bookmark('11'))?.name, 'Posta');
  assert.equal(updates(), before);
  assert.ok(setup.chrome.calls.slice(calls).every((call) => call.startsWith('getTree')));
});

test('never writes the icon or the favicon', async () => {
  const { labels, sync, updates } = setupOf();
  await labels.set(LabelKeys.bookmark('11'), { icon: { emoji: '📧' }, favicon: 'https://row.example/icon.png' });
  await labels.set(LabelKeys.bookmark('11'), { icon: { symbol: 'star' } });
  await sync.settled();
  assert.equal(updates(), 0);
});

test('does not sync a bookmark outside the base folder and the Favorites folder', async () => {
  const { labels, sync, updates } = setupOf();
  await labels.set(LabelKeys.bookmark('31'), { name: 'Via' });
  await sync.settled();
  assert.equal(updates(), 0);
});

test('skips a bookmark with no uuid and tries it again at the next pass', async () => {
  const { setup, labels, sync, settings } = setupOf();
  await labels.set(LabelKeys.bookmark('12'), { name: 'Senza' });
  await sync.settled();
  assert.deepEqual(setup.chrome.calls.filter((call) => call.startsWith('update')), []);
  const node = nodeOf(setup.chrome.tree, '12') as BookmarkNode;
  node.uuid = 'u-12';
  await sync.apply();
  assert.equal(await settings.get('Casetta', 'name:uuid:u-12'), 'Senza');
});

test('logs once when the name cannot be written', async () => {
  const failing = { all: async (): Promise<Record<string, unknown>> => ({}), set: async (): Promise<void> => Promise.reject(new Error('no store')) };
  const { setup, labels, sync } = setupOf({ settings: failing });
  await labels.set(LabelKeys.bookmark('11'), { name: 'Posta' });
  await labels.set(LabelKeys.bookmark('21'), { name: 'Casa' });
  await sync.settled();
  assert.equal(setup.sink.warnings.length, 1);
});
