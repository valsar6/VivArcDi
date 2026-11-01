import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../../src/core/BrowserPrefs.js';
import type { Logger } from '../../../src/core/Logger.js';
import { TabData } from '../../../src/core/TabData.js';
import { HiddenTabs } from '../../../src/core/HiddenTabs.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { BookmarkFolders } from '../../../src/modules/folders/BookmarkFolders.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { FolderCommands } from '../../../src/core/FolderCommands.js';
import { BookmarkWriter } from '../../../src/core/bookmarks/BookmarkWriter.js';
import { BrowserBookmarks } from '../../../src/core/bookmarks/BrowserBookmarks.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';
import { CASETTA, FakePrefsApi, WORK } from '../../core/prefs.js';
import { FolderTabs, WritableChrome, bookmarkTree, folder, link, recordingChrome } from './fakes.js';

const MAHJONG = 'https://mahjongsoul.game.yo-star.com/';
const TREE = bookmarkTree([folder('10', 'Hobbies', [link('11', 'Mahjong Soul', MAHJONG)]), folder('20', 'Music')]);

const DEFAULT_OPTIONS = { root: 'Importati da Firefox/Bookmarks Bar', maxDepth: 3, maxHeightPercent: 60 };

interface SetupExtras {
  options?: Record<string, unknown>;
  prefs?: BrowserPrefs;
  logger?: Logger;
  bookmarkWriter?: BookmarkWriter;
}

function setup(
  tabs: FolderTabs,
  bookmarks: BrowserBookmarks = recordingChrome(TREE).bookmarks,
  { options = DEFAULT_OPTIONS, prefs = new BrowserPrefs(undefined), logger = silentLogger(), bookmarkWriter = new BookmarkWriter(undefined) }: SetupExtras = {},
): { dom: DomDocument; module: BookmarkFolders; context: ModuleContext } {
  const dom = new DomDocument();
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ tabListHost: '.list', browser: '#browser', tabStrip: '.strip', tabWrapper: '.wrapper' }, 'test'),
    logger,
    options,
    tabs,
    bookmarks,
    bookmarkWriter,
    prefs,
    storage: new MemoryStorage(),
  } as unknown as ModuleContext;
  return { dom, module: new BookmarkFolders(), context };
}

const frame = async (): Promise<void> => {
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 5));
};

const toggleDelay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 280));

const rows = (dom: DomDocument): DomNode[] => dom.parent.children[0]?.children[0]?.children ?? [];

function installFrames(t: TestContext): void {
  const frames = globalThis as unknown as Record<string, unknown>;
  frames['requestAnimationFrame'] = (run: () => void): NodeJS.Timeout => setTimeout(run, 0);
  frames['cancelAnimationFrame'] = (handle: NodeJS.Timeout): void => clearTimeout(handle);
  frames['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => {
    delete frames['requestAnimationFrame'];
    delete frames['cancelAnimationFrame'];
    delete frames['MutationObserver'];
  });
}

test('draws the folders above the tab list and removes them on stop', async (t) => {
  installFrames(t);
  const tabs = new FolderTabs([{ id: 1, active: true, url: 'https://example.com/' }]);
  const { dom, module, context } = setup(tabs);
  await module.start(context);
  await frame();
  assert.deepEqual(
    rows(dom).map((row) => row.textContent === '' ? row.children[1]?.textContent : row.textContent),
    ['Hobbies', 'Music'],
  );

  rows(dom)[0]?.click();
  await toggleDelay();
  await frame();
  assert.equal(rows(dom).length, 3);

  rows(dom)[1]?.click();
  await settle();
  assert.deepEqual(tabs.actions()[0]?.[0], 'create');

  module.stop();
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.equal(tabs.listenerCount(), 0);
});

test('hides the tab of a link from the tab list', async (t) => {
  installFrames(t);
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: 'https://id.atlassian.com/login', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11' } }) },
  ]);
  const { dom, module, context } = setup(tabs);
  const hidden = HiddenTabs.of(context.document);
  await module.start(context);
  await frame();
  assert.deepEqual([1, 2].map((id) => hidden.has(id)), [false, true]);

  module.stop();
  assert.deepEqual([1, 2].map((id) => hidden.has(id)), [false, false]);
  assert.deepEqual(dom.parent.children, [dom.list]);
});

test('links the open tab of a link at start and unlinks the tab of a removed bookmark', async (t) => {
  installFrames(t);
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/' },
    { id: 2, url: MAHJONG },
    { id: 3, url: 'https://old.example/', vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '99' } }) },
  ]);
  const { module, context } = setup(tabs);
  const hidden = HiddenTabs.of(context.document);
  await module.start(context);
  await frame();
  assert.deepEqual(JSON.parse(tabs.tabs.get(2)?.vivExtData ?? '{}'), { vivarcdi: { bookmarkId: '11' } });
  assert.equal(tabs.tabs.get(3)?.vivExtData, '{}');
  assert.deepEqual([2, 3].map((id) => hidden.has(id)), [true, false]);
  module.stop();
});

test('bookmark folders stay off without chrome.bookmarks', async () => {
  const tabs = new FolderTabs();
  const { dom, module, context } = setup(tabs, new BrowserBookmarks(undefined));
  await module.start(context);
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.equal(tabs.listenerCount(), 0);
});

test('bookmark folders stay off when the tab list is missing', async () => {
  const tabs = new FolderTabs();
  const { dom, module, context } = setup(tabs);
  dom.list.remove();
  await module.start(context);
  assert.equal(tabs.listenerCount(), 0);
});

const WORKSPACE_TREE = bookmarkTree([
  folder('10', 'Work', [folder('11', 'Jira', [link('12', 'Board', 'https://jira.example/')])]),
  folder('20', 'Music', [folder('21', 'Radio'), link('22', 'Player', 'https://player.example/')]),
]);
const BAR = 'Importati da Firefox/Bookmarks Bar';
const WORKSPACE_OPTIONS = { root: '', workspaces: { Casetta: `${BAR}/Work`, Work: `${BAR}/Music` }, maxDepth: 3, maxHeightPercent: 60 };

const inWorkspace = (workspaceId: number): string => JSON.stringify({ workspaceId });

function workspaceSetup(options: Record<string, unknown> = WORKSPACE_OPTIONS, chrome?: WritableChrome): { tabs: FolderTabs; prefs: FakePrefsApi; dom: DomDocument; module: BookmarkFolders; context: ModuleContext } {
  const tabs = new FolderTabs([
    { id: 1, active: true, url: 'https://example.com/', vivExtData: inWorkspace(CASETTA.id) },
    { id: 2, url: 'https://example.org/', vivExtData: inWorkspace(WORK.id) },
    { id: 3, url: 'https://example.net/' },
  ]);
  const prefs = new FakePrefsApi();
  prefs.values.set('vivaldi.workspaces.list', [CASETTA, WORK]);
  return { tabs, prefs, ...setup(tabs, chrome?.reader ?? recordingChrome(WORKSPACE_TREE).bookmarks, { options, prefs: new BrowserPrefs(prefs), ...(chrome === undefined ? {} : { bookmarkWriter: chrome.writer }) }) };
}

function activate(tabs: FolderTabs, tabId: number): void {
  tabs.tabs.forEach((tab, id) => tabs.tabs.set(id, { ...tab, active: id === tabId }));
  tabs.activated.forEach((listener) => listener({ tabId, windowId: 1 }));
}

const titles = (dom: DomDocument): Array<string | undefined> => rows(dom).map((row) => (row.textContent === '' ? row.children[1]?.textContent : row.textContent));
const sectionOf = (dom: DomDocument): DomNode | undefined => dom.parent.children[0]?.children[0];

test('shows the folders of the active workspace', async (t) => {
  installFrames(t);
  const { tabs, dom, module, context } = workspaceSetup();
  await module.start(context);
  await frame();
  assert.deepEqual(titles(dom), ['Jira']);

  activate(tabs, 2);
  await frame();
  assert.deepEqual(titles(dom), ['Radio', 'Player']);

  activate(tabs, 1);
  await frame();
  assert.deepEqual(titles(dom), ['Jira']);
  module.stop();
});

test('follows a renamed workspace', async (t) => {
  installFrames(t);
  const { tabs, prefs, dom, module, context } = workspaceSetup();
  await module.start(context);
  activate(tabs, 2);
  await frame();
  assert.deepEqual(titles(dom), ['Radio', 'Player']);

  prefs.set('vivaldi.workspaces.list', [CASETTA, { ...WORK, name: 'Elsewhere' }]);
  await frame();
  assert.deepEqual(titles(dom), [], 'a workspace with no entry uses the empty root');
  module.stop();
});

test('falls back to the default root outside any workspace', async (t) => {
  installFrames(t);
  const { tabs, dom, module, context } = workspaceSetup({ ...WORKSPACE_OPTIONS, root: `${BAR}/Music` });
  await module.start(context);
  activate(tabs, 3);
  await frame();
  assert.deepEqual(titles(dom), ['Radio', 'Player']);
  module.stop();
});

test('hides the section when the root is empty', async (t) => {
  installFrames(t);
  const { tabs, dom, module, context } = workspaceSetup({ ...WORKSPACE_OPTIONS, workspaces: { Casetta: `${BAR}/Work`, Work: '' } });
  await module.start(context);
  await frame();
  assert.equal(sectionOf(dom)?.hasAttribute('data-vivarcdi-empty'), false);

  activate(tabs, 2);
  await frame();
  assert.equal(sectionOf(dom)?.hasAttribute('data-vivarcdi-empty'), true);
  assert.deepEqual(titles(dom), []);

  activate(tabs, 1);
  await frame();
  assert.equal(sectionOf(dom)?.hasAttribute('data-vivarcdi-empty'), false);
  module.stop();
});

test('keeps the folders open in each workspace apart', async (t) => {
  installFrames(t);
  const { tabs, dom, module, context } = workspaceSetup({ ...WORKSPACE_OPTIONS, workspaces: { Casetta: `${BAR}/Work`, Work: `${BAR}/Work` } });
  await module.start(context);
  await frame();
  rows(dom)[0]?.click();
  await toggleDelay();
  await frame();
  assert.equal(rows(dom).length, 2);

  activate(tabs, 2);
  await frame();
  assert.equal(rows(dom).length, 1);

  activate(tabs, 1);
  await frame();
  assert.equal(rows(dom).length, 2);
  module.stop();
});

test('keeps the tab of a link linked while another workspace shows its own folders', async (t) => {
  installFrames(t);
  const { tabs, dom, module, context } = workspaceSetup();
  tabs.tabs.set(4, { id: 4, windowId: 1, url: 'https://jira.example/', vivExtData: JSON.stringify({ workspaceId: CASETTA.id, vivarcdi: { bookmarkId: '12' } }) });
  await module.start(context);
  activate(tabs, 2);
  await frame();
  await frame();
  assert.deepEqual(titles(dom), ['Radio', 'Player']);
  assert.equal(TabData.ownOf(tabs.tabs.get(4) as chrome.tabs.Tab).bookmarkId, '12');
  module.stop();
});

test('creates nothing until the first write', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  const { tabs, dom, module, context } = workspaceSetup({ root: '', workspaces: {}, maxDepth: 3, maxHeightPercent: 60 }, chrome);
  await module.start(context);
  await frame();
  activate(tabs, 2);
  await frame();
  assert.equal(sectionOf(dom)?.hasAttribute('hidden'), true);
  assert.deepEqual(titles(dom), []);
  assert.deepEqual(chrome.calls.filter((call) => !call.startsWith('get')), []);
  module.stop();
});

test('shows the folder named after the workspace once it exists', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(bookmarkTree([folder('30', 'VivArcDi', [folder('31', 'Casetta', [folder('32', 'Hobbies'), link('33', 'Chess', 'https://chess.com/')])])]));
  const { dom, module, context } = workspaceSetup({ root: '', workspaces: {}, maxDepth: 3, maxHeightPercent: 60 }, chrome);
  await module.start(context);
  await frame();
  assert.deepEqual(titles(dom), ['Hobbies', 'Chess']);
  module.stop();
});

test('listens to Cmd/Ctrl+D while it runs and stops on stop', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  const { dom, module, context } = workspaceSetup({ root: '', workspaces: {}, maxDepth: 3, maxHeightPercent: 60 }, chrome);
  await module.start(context);
  assert.equal(dom.listeners.get('keydown')?.length, 1);
  module.stop();
  assert.deepEqual(dom.listeners.get('keydown'), []);
});

const EDITABLE = { root: '', workspaces: { Casetta: `${BAR}/Work` }, maxDepth: 3, maxHeightPercent: 60 };
const fieldOf = (dom: DomDocument): DomNode | undefined => rows(dom)[0]?.children.find((child) => child.hasAttribute('data-vivarcdi-edit'));
const keyOn = (node: DomNode | undefined, key: string): void => node?.bubble({ type: 'keydown', key, stopPropagation: (): void => undefined, preventDefault: (): void => undefined } as unknown as Event);
const doubleClickFirst = (dom: DomDocument): void => rows(dom)[0]?.bubble({ type: 'dblclick', target: rows(dom)[0] } as unknown as Event);

test('saves the typed name of a folder', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  const { dom, module, context } = workspaceSetup(EDITABLE, chrome);
  await module.start(context);
  await frame();
  doubleClickFirst(dom);
  const field = fieldOf(dom);
  assert.ok(field);
  field.value = 'Boards';
  keyOn(field, 'Enter');
  await frame();
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('update')), ['update 11']);
  assert.deepEqual(titles(dom), ['Boards']);
  module.stop();
});

test('keeps the name on escape or empty text', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  const { dom, module, context } = workspaceSetup(EDITABLE, chrome);
  await module.start(context);
  await frame();
  doubleClickFirst(dom);
  const escaped = fieldOf(dom);
  assert.ok(escaped);
  escaped.value = 'Never';
  keyOn(escaped, 'Escape');
  doubleClickFirst(dom);
  const empty = fieldOf(dom);
  assert.ok(empty);
  empty.value = '  ';
  keyOn(empty, 'Enter');
  await frame();
  assert.deepEqual(chrome.calls.filter((call) => call.startsWith('update')), []);
  assert.deepEqual(titles(dom), ['Jira']);
  module.stop();
});

test('puts the folder back to its name when the rename fails', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  chrome.failing.add('update');
  const { dom, module, context } = workspaceSetup(EDITABLE, chrome);
  await module.start(context);
  await frame();
  doubleClickFirst(dom);
  const field = fieldOf(dom);
  assert.ok(field);
  field.value = 'Boards';
  keyOn(field, 'Enter');
  await frame();
  assert.deepEqual(titles(dom), ['Jira']);
  module.stop();
});

test('edits the new folder right after the plus button asks for it', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORKSPACE_TREE);
  const { dom, module, context } = workspaceSetup(EDITABLE, chrome);
  await module.start(context);
  await frame();
  FolderCommands.of(context.document).requestNewFolder();
  await frame();
  assert.deepEqual(chrome.created, ['Untitled']);
  assert.deepEqual(titles(dom).length, 2);
  const field = rows(dom)[1]?.children.find((child) => child.hasAttribute('data-vivarcdi-edit'));
  assert.equal(field?.value, 'Untitled');
  assert.equal(field?.selected, true);
  module.stop();
});

const TODAY_TAB_ID = 7;

function todayTabTarget(): unknown {
  const wrapper = { dataset: { id: `tab-${TODAY_TAB_ID}` }, closest: (): unknown => wrapper, querySelector: (): null => null };
  return { closest: (): unknown => wrapper, querySelector: (): unknown => wrapper };
}

function dragFromList(dom: DomDocument, from: { x: number; y: number }, to: { x: number; y: number }): void {
  dom.emit('mousedown', { button: 0, buttons: 1, clientX: from.x, clientY: from.y, target: todayTabTarget() });
  dom.emit('mousemove', { buttons: 1, clientX: to.x, clientY: to.y });
  dom.emit('mouseup', { buttons: 0, clientX: to.x, clientY: to.y });
}

function layOut(dom: DomDocument): void {
  const section = sectionOf(dom);
  assert.ok(section);
  section.rect = { left: 0, right: 200, top: 0, bottom: section.children.length * 30 };
  section.children.forEach((row, index) => (row.rect = { left: 0, right: 200, top: index * 30, bottom: index * 30 + 30 }));
}

const WORK_LINKS = bookmarkTree([folder('10', 'Work', [link('21', 'First', 'https://first.example/'), link('22', 'Second', 'https://second.example/')])]);

test('adds a dropped tab at the position of the drop', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORK_LINKS);
  const { tabs, dom, module, context } = workspaceSetup(EDITABLE, chrome);
  tabs.open({ id: TODAY_TAB_ID, url: 'https://dropped.example/', title: 'Dropped' });
  await module.start(context);
  await frame();
  layOut(dom);
  dragFromList(dom, { x: 500, y: 300 }, { x: 50, y: 35 });
  await frame();
  assert.deepEqual(chrome.created, ['Dropped']);
  assert.deepEqual(titles(dom), ['First', 'Dropped', 'Second']);
  assert.equal(TabData.ownOf(await tabs.get(TODAY_TAB_ID)).bookmarkId, '500');
  module.stop();
});

test('adds a dropped tab at the end when it is released under the last row', async (t) => {
  installFrames(t);
  const chrome = new WritableChrome(WORK_LINKS);
  const { tabs, dom, module, context } = workspaceSetup(EDITABLE, chrome);
  tabs.open({ id: TODAY_TAB_ID, url: 'https://dropped.example/', title: 'Dropped' });
  await module.start(context);
  await frame();
  layOut(dom);
  dragFromList(dom, { x: 500, y: 300 }, { x: 50, y: 55 });
  await frame();
  assert.deepEqual(titles(dom), ['First', 'Second', 'Dropped']);
  module.stop();
});
