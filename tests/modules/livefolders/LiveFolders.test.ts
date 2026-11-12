import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { MENU_ATTRIBUTE } from '../../../src/core/ContextMenu.js';
import type { MenuItem, SubmenuItem } from '../../../src/core/ContextMenu.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { SpaceMenuItems } from '../../../src/shared/spaces/SpaceMenuItems.js';
import { VirtualFolders } from '../../../src/shared/links/VirtualFolders.js';
import { LiveFolders } from '../../../src/modules/livefolders/LiveFolders.js';
import { CONNECTION_STORAGE_KEY } from '../../../src/modules/livefolders/GithubConnection.js';
import { PANEL_ATTRIBUTE } from '../../../src/modules/livefolders/ConnectPanel.js';
import { LiveFolderStore, LIVE_FOLDERS_STORAGE_KEY } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { asDocument, DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { FolderTabs, WritableChrome, bookmarkTree, link } from '../folders/fakes.js';
import { settle } from '../reopen/fakes.js';
import { CODE_URL } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import { FakeDeviceGithub, FakeGithub, ME, MemoryStorage, pullRequest, recordingLogger } from './fakes.js';

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

function setup(t: TestContext, { storage = new MemoryStorage(), token = TOKEN, hang = false, clientId = 'Iv1.client' }: { storage?: MemoryStorage; token?: string | null; hang?: boolean; clientId?: string } = {}): Setup {
  const dom = new DomDocument();
  const github = new FakeGithub([pullRequest(1, { title: 'Mine' }), pullRequest(2, { title: 'Theirs', author: 'ada', reviewRequested: true })]);
  const original = globalThis.fetch;
  if (token !== null) {
    storage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify({ token, login: ME }));
  }
  storage.writes.length = 0;
  globalThis.fetch = ((url: string, init: { method: 'GET'; headers: Record<string, string> }) => {
    if (url === CODE_URL) {
      return Promise.resolve({ ok: true, status: 200, json: async () => new FakeDeviceGithub().code });
    }
    return hang ? new Promise(() => undefined) : github.fetch(url, init);
  }) as unknown as typeof fetch;
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
    options: { enabled: true, refreshMinutes: 5, githubClientId: clientId },
    tabs: new FolderTabs([{ id: 1, active: true, url: 'https://a.example/', vivExtData: inWorkspace }]),
    storage,
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

const childTitles = (virtual: VirtualFolders): string[] => {
  const [folder] = virtual.entriesFor(WORKSPACE);
  return folder?.kind === 'folder' ? folder.children.map((child) => child.title) : [];
};

test('shows only the Connect GitHub row when GitHub is not connected and sends no request', async (t) => {
  const context = setup(t, { token: null });
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  await settle();
  assert.deepEqual(childTitles(context.virtual), ['Connect GitHub']);
  assert.equal(context.github.requests.length, 0);
});

test('opens the connect panel from the Connect GitHub row', async (t) => {
  const context = setup(t, { token: null });
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  const [folder] = context.virtual.entriesFor(WORKSPACE);
  assert.equal(context.virtual.activate(`${folder?.id}:connect`), true);
  await settle();
  assert.ok(context.dom.created.some((node) => node.hasAttribute(PANEL_ATTRIBUTE) && node.parentElement !== null));
  assert.equal(context.virtual.activate(`${folder?.id}:7`), false);
  assert.deepEqual(context.github.requests, []);
});

test('says GitHub is not set up without a client id, opens no panel and logs one warning', async (t) => {
  const context = setup(t, { token: null, clientId: '' });
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  const [folder] = context.virtual.entriesFor(WORKSPACE);
  assert.deepEqual(childTitles(context.virtual), ['GitHub is not set up in this VivArcDi']);
  assert.equal(context.virtual.activate(`${folder?.id}:connect`), true);
  await settle();
  assert.ok(!context.dom.created.some((node) => node.hasAttribute(PANEL_ATTRIBUTE)));
  assert.equal(context.lines().filter((line) => line.includes('githubClientId')).length, 1);
});

test('disconnects from the folder menu: every folder asks to connect again', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  createFolder(context.dom);
  await settle();
  await settle();
  const [first] = context.virtual.entriesFor(WORKSPACE);
  assert.ok(first !== undefined);
  context.virtual.openMenu(first.id, 1, 2);
  menuItems(context.dom).find((row) => row.textContent === 'Disconnect GitHub')?.click();
  await settle();
  await settle();
  const folders = context.virtual.entriesFor(WORKSPACE);
  assert.deepEqual(folders.map((folder) => (folder.kind === 'folder' ? folder.children.map((child) => child.title) : [])), [['Connect GitHub'], ['Connect GitHub']]);
  assert.ok(!(context.storage.getItem(CONNECTION_STORAGE_KEY) ?? '').includes(TOKEN));
});

test('offers Copy Link and Archive Pull Request on a pull request row, and nothing on the connect row', async (t) => {
  const context = setup(t);
  await context.module.start(context.context);
  createFolder(context.dom);
  await settle();
  await settle();
  const [folder] = context.virtual.entriesFor(WORKSPACE);
  const row = folder?.kind === 'folder' ? folder.children[0] : undefined;
  assert.ok(row !== undefined);
  context.virtual.openMenu(row.id, 3, 4);
  assert.deepEqual(menuItems(context.dom).map((item) => item.textContent), ['Copy Link', 'Archive Pull Request']);
  menuItems(context.dom).find((item) => item.textContent === 'Archive Pull Request')?.click();
  assert.deepEqual(childTitles(context.virtual), ['Mine']);
  const before = context.dom.created.length;
  context.virtual.openMenu(`${folder?.id}:connect`, 3, 4);
  assert.equal(context.dom.created.length, before);
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
