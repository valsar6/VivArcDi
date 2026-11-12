import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { MENU_ATTRIBUTE } from '../../../src/core/ContextMenu.js';
import type { MenuItem, SubmenuItem } from '../../../src/core/ContextMenu.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { SpaceMenuItems } from '../../../src/core/SpaceMenuItems.js';
import { VirtualFolders } from '../../../src/core/VirtualFolders.js';
import { LiveFolders } from '../../../src/modules/livefolders/LiveFolders.js';
import { LiveFolderStore, LIVE_FOLDERS_STORAGE_KEY } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { FolderTabs, WritableChrome, bookmarkTree, link } from '../folders/fakes.js';
import { settle } from '../reopen/fakes.js';
import { FakeGithub, MemoryStorage, pullRequest, recordingLogger } from './fakes.js';

const TOKEN = 'ghp_module_token';
const WORKSPACE = '5';
const inWorkspace = JSON.stringify({ workspaceId: 5 });

interface Setup {
  dom: DomDocument;
  module: LiveFolders;
  context: ModuleContext;
  storage: MemoryStorage;
  github: FakeGithub;
  bookmarks: WritableChrome;
  virtual: VirtualFolders;
  lines: () => string[];
}

function setup(t: TestContext, { storage = new MemoryStorage(), token = TOKEN, hang = false }: { storage?: MemoryStorage; token?: string | null; hang?: boolean } = {}): Setup {
  const dom = new DomDocument();
  const github = new FakeGithub([pullRequest(1, { title: 'Mine' }), pullRequest(2, { title: 'Theirs', author: 'ada', reviewRequested: true })]);
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string, init: { headers: Record<string, string> }) => (hang ? new Promise(() => undefined) : github.fetch(url, init))) as unknown as typeof fetch;
  const { logger, sink } = recordingLogger();
  const bookmarks = new WritableChrome(bookmarkTree([link('10', 'Docs', 'https://docs.example/')]));
  const module = new LiveFolders();
  t.after(() => {
    module.stop();
    globalThis.fetch = original;
  });
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ browser: '#browser', tabListHost: '.list', tabStrip: '.strip', tabWrapper: '.wrapper' }, 'test'),
    logger,
    options: { enabled: true, refreshMinutes: 5 },
    tabs: new FolderTabs([{ id: 1, active: true, url: 'https://a.example/', vivExtData: inWorkspace }]),
    storage,
    payload: { url: (path: string): string => path, json: async (): Promise<never> => Promise.reject(new Error('no json')), text: async (): Promise<string> => (token === null ? Promise.reject(new Error('404')) : token) },
    bookmarks: bookmarks.reader,
    bookmarkWriter: bookmarks.writer,
  } as unknown as ModuleContext;
  return { dom, module, context, storage, github, bookmarks, virtual: VirtualFolders.of(dom), lines: (): string[] => sink.lines };
}

const menuItems = (dom: DomDocument): DomNode[] => dom.created.findLast((node) => node.hasAttribute(MENU_ATTRIBUTE) && node.parentElement !== null)?.children ?? [];
const spaceItem = (dom: DomDocument, label: string): MenuItem | undefined => SpaceMenuItems.of(dom).items().find((item) => item.label === label);
const createFolder = (dom: DomDocument): void => {
  const github = (spaceItem(dom, 'Live Folders') as SubmenuItem).items.find((item) => item.label === 'GitHub');
  (github as { run: () => void }).run();
};

test('adds Live Folders › GitHub to the space menu, which creates a folder in the active workspace', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  const live = spaceItem(context.dom, 'Live Folders') as SubmenuItem;
  assert.deepEqual(live.items.map((item) => item.label), ['GitHub']);
  const revealed: string[] = [];
  context.virtual.onReveal((id) => void revealed.push(id));
  createFolder(context.dom);
  const [entry] = context.virtual.entriesFor(WORKSPACE);
  assert.deepEqual([entry?.kind, entry?.title, entry?.kind === 'folder' ? entry.live : undefined], ['folder', 'Pull Requests', true]);
  assert.deepEqual(revealed, [entry?.id]);
  await settle();
  await settle();
  const folder = context.virtual.entriesFor(WORKSPACE)[0];
  assert.deepEqual(folder?.kind === 'folder' ? folder.children.map((child) => child.title) : [], ['Theirs', 'Mine']);
  assert.deepEqual(context.virtual.entriesFor('6'), []);
});

test('restores the last rows at startup', async (t) => {
  const storage = new MemoryStorage();
  const seed = new LiveFolderStore(storage, recordingLogger().logger, () => 'f1');
  seed.add(WORKSPACE);
  seed.update('f1', { rows: [{ id: '9', title: 'Kept row', url: 'https://github.com/a/b/pull/9', subtitle: 'ada · a/b', updatedAt: '2026-11-01T00:00:00Z' }] });
  const context = setup(t, { storage, hang: true });
  await context.module.start(context.context);
  const [folder] = context.virtual.entriesFor(WORKSPACE);
  assert.deepEqual(folder?.kind === 'folder' ? folder.children.map((child) => child.title) : [], ['Kept row']);
  assert.equal(context.virtual.ready, true);
  assert.equal(context.github.requests.length, 0);
});

test('deleting a live folder leaves bookmarks untouched', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  await settle();
  const [entry] = context.virtual.entriesFor(WORKSPACE);
  assert.ok(entry !== undefined);
  context.virtual.openMenu(entry.id, 10, 20);
  const remove = menuItems(context.dom).find((row) => row.textContent === 'Delete Live Folder');
  assert.ok(remove !== undefined);
  remove.click();
  assert.deepEqual(context.virtual.entriesFor(WORKSPACE), []);
  assert.equal(context.storage.getItem(LIVE_FOLDERS_STORAGE_KEY), '{}');
  assert.deepEqual(context.bookmarks.calls, []);
  assert.equal(context.bookmarks.tree.length, 1);
});

test('renames a live folder and keeps the name', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  const [entry] = context.virtual.entriesFor(WORKSPACE);
  context.virtual.rename(entry?.id ?? '', 'Work');
  assert.equal(context.virtual.entriesFor(WORKSPACE)[0]?.title, 'Work');
  assert.equal(new LiveFolderStore(context.storage, recordingLogger().logger).all()[0]?.name, 'Work');
  assert.deepEqual(context.bookmarks.calls, []);
});

test('refreshes a live folder when it is opened', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  await settle();
  const before = context.github.requests.length;
  context.virtual.open(context.virtual.entriesFor(WORKSPACE)[0]?.id ?? '');
  await settle();
  await settle();
  assert.equal(context.github.requests.length, before + 2);
});

test('shows only the Connect GitHub row without a token and sends no request', async (t) => {
  const context = setup(t, { token: null });
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  await settle();
  const [folder] = context.virtual.entriesFor(WORKSPACE);
  assert.deepEqual(folder?.kind === 'folder' ? folder.children.map((child) => child.title) : [], ['Connect GitHub']);
  assert.equal(context.github.requests.length, 0);
});

test('stops cleanly: the folders leave the section, the stored ones stay', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  context.module.stop();
  assert.deepEqual(context.virtual.entriesFor(WORKSPACE), []);
  assert.equal(spaceItem(context.dom, 'Live Folders'), undefined);
  assert.equal(new LiveFolderStore(context.storage, recordingLogger().logger).all().length, 1);
  context.virtual.rename('live:whatever', 'ignored');
});

test('stays off without chrome.tabs', async (t) => {
  const context = setup(t);
  (context.context.tabs as unknown as { available: boolean }).available = false;
  await context.module.start(context.context);
  assert.equal(spaceItem(context.dom, 'Live Folders'), undefined);
  assert.equal(context.virtual.ready, false);
  assert.ok(context.lines().some((line) => line.includes('live folders are off')));
});
