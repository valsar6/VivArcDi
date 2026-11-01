import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPrefs } from '../../../src/core/BrowserPrefs.js';
import { FolderCommands } from '../../../src/core/FolderCommands.js';
import { HiddenTabs } from '../../../src/core/HiddenTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { ModuleRegistry } from '../../../src/core/ModuleRegistry.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { SpaceCollapse } from '../../../src/core/SpaceCollapse.js';
import { SpaceHeader } from '../../../src/modules/spaceheader/SpaceHeader.js';
import { DomDocument, asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { CASETTA, FakePrefsApi, WORK } from '../../core/prefs.js';
import { FolderTabs } from '../folders/fakes.js';
import { MemoryStorage, settle, silentLogger } from '../reopen/fakes.js';

const LIST = 'vivaldi.workspaces.list';
const HEART = '❤️';
const inWorkspace = (workspaceId: number): string => JSON.stringify({ workspaceId });

interface Setup {
  dom: DomDocument;
  module: SpaceHeader;
  context: ModuleContext;
  tabs: FolderTabs;
  api: FakePrefsApi;
  storage: MemoryStorage;
}

function setup(tabs: FolderTabs, { api = new FakePrefsApi(), logger = silentLogger(), storage = new MemoryStorage() }: { api?: FakePrefsApi; logger?: Logger; storage?: MemoryStorage } = {}, prefs?: BrowserPrefs): Setup {
  const dom = new DomDocument();
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog({ tabListHost: '.list', browser: '#browser', tabStrip: '.strip', tabWrapper: '.wrapper' }, 'test'),
    logger,
    options: { enabled: true },
    tabs,
    prefs: prefs ?? new BrowserPrefs(api),
    storage,
  } as unknown as ModuleContext;
  return { dom, module: new SpaceHeader(), context, tabs, api, storage };
}

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

const headerOf = (dom: DomDocument): DomNode | undefined => dom.parent.children[0]?.children[0];
const shownParts = (dom: DomDocument): DomNode[] => headerOf(dom)?.children.filter((part) => !part.hasAttribute('data-vivarcdi-space-add')) ?? [];
const partsOf = (dom: DomDocument): string[] => shownParts(dom).map((part) => part.textContent);
const nameOf = (dom: DomDocument): string | undefined => shownParts(dom).at(-1)?.textContent;
const isCollapsed = (dom: DomDocument): boolean => headerOf(dom)?.hasAttribute('data-vivarcdi-collapsed') === true;

function switchTo(tabs: FolderTabs, tabId: number): void {
  tabs.tabs.forEach((tab, id) => tabs.tabs.set(id, { ...tab, active: id === tabId }));
  tabs.activated.forEach((listener) => listener({ tabId, windowId: 1 }));
}

const TABS = (): FolderTabs =>
  new FolderTabs([
    { id: 1, active: true, url: 'https://a.example/', vivExtData: inWorkspace(CASETTA.id) },
    { id: 2, url: 'https://b.example/', vivExtData: inWorkspace(WORK.id) },
    { id: 3, url: 'https://c.example/' },
  ]);

function twoWorkspaces(): FakePrefsApi {
  const api = new FakePrefsApi();
  api.values.set(LIST, [{ ...CASETTA, icon: HEART }, WORK]);
  return api;
}

test('shows the icon and name of the active workspace', async (t) => {
  installFrames(t);
  const { dom, module, context } = setup(TABS(), { api: twoWorkspaces() });
  await module.start(context);
  assert.equal(headerOf(dom)?.hasAttribute('data-vivarcdi-space-header'), true);
  assert.deepEqual(partsOf(dom), ['', HEART, 'Casetta']);

  module.stop();
  assert.deepEqual(dom.parent.children, [dom.list]);
});

test('shows the first letter of the name when the icon cannot be shown', async (t) => {
  installFrames(t);
  const api = new FakePrefsApi();
  api.values.set(LIST, [CASETTA, WORK]);
  const { dom, module, context } = setup(TABS(), { api });
  await module.start(context);
  assert.deepEqual(partsOf(dom), ['', 'C', 'Casetta']);
  module.stop();
});

test('shows the new workspace and its state on switch', async (t) => {
  installFrames(t);
  const storage = new MemoryStorage();
  storage.setItem('vivarcdi.spaceCollapsed.' + WORK.id, 'true');
  const { dom, module, context, tabs } = setup(TABS(), { api: twoWorkspaces(), storage });
  await module.start(context);
  assert.equal(nameOf(dom), 'Casetta');
  assert.equal(isCollapsed(dom), false);

  switchTo(tabs, 2);
  await settle();
  assert.equal(nameOf(dom), 'Work');
  assert.equal(isCollapsed(dom), true);
  assert.equal(SpaceCollapse.of(context.document).collapsed, true);

  switchTo(tabs, 1);
  await settle();
  assert.equal(nameOf(dom), 'Casetta');
  assert.equal(isCollapsed(dom), false);
  module.stop();
});

test('follows a renamed workspace', async (t) => {
  installFrames(t);
  const api = twoWorkspaces();
  const { dom, module, context } = setup(TABS(), { api });
  await module.start(context);
  api.set(LIST, [{ ...CASETTA, name: 'Home', icon: '★' }, WORK]);
  await settle();
  assert.deepEqual(partsOf(dom), ['', '★', 'Home']);
  module.stop();
});

test('uses Tabs outside any workspace', async (t) => {
  installFrames(t);
  const tabs = TABS();
  const { dom, module, context } = setup(tabs, { api: twoWorkspaces() });
  await module.start(context);
  switchTo(tabs, 3);
  await settle();
  assert.deepEqual(partsOf(dom), ['', 'Tabs']);
  module.stop();
});

test('toggles the collapsed state on click', async (t) => {
  installFrames(t);
  const { dom, module, context } = setup(TABS(), { api: twoWorkspaces() });
  const collapse = SpaceCollapse.of(context.document);
  await module.start(context);
  headerOf(dom)?.click();
  assert.equal(collapse.collapsed, true);
  assert.equal(isCollapsed(dom), true);
  assert.equal(headerOf(dom)?.properties.get('-webkit-app-region'), 'no-drag');

  headerOf(dom)?.click();
  assert.equal(collapse.collapsed, false);
  assert.equal(isCollapsed(dom), false);
  module.stop();
});

test('remembers the collapsed state of each workspace', async (t) => {
  installFrames(t);
  const tabs = TABS();
  const first = setup(tabs, { api: twoWorkspaces() });
  await first.module.start(first.context);
  headerOf(first.dom)?.click();
  switchTo(tabs, 2);
  await settle();
  assert.equal(isCollapsed(first.dom), false);
  switchTo(tabs, 1);
  await settle();
  assert.equal(isCollapsed(first.dom), true);
  first.module.stop();

  const restarted = setup(TABS(), { api: twoWorkspaces(), storage: first.storage });
  await restarted.module.start(restarted.context);
  assert.equal(isCollapsed(restarted.dom), true);
  switchTo(restarted.tabs, 2);
  await settle();
  assert.equal(isCollapsed(restarted.dom), false);
  restarted.module.stop();
});

test('falls back to Tabs when workspaces are unreadable', async (t) => {
  installFrames(t);
  const warnings: unknown[][] = [];
  const logger = new Logger('test', { info: (): void => undefined, error: (): void => undefined, warn: (...message: unknown[]): void => void warnings.push(message) });
  const tabs = TABS();
  const { dom, module, context } = setup(tabs, { logger }, new BrowserPrefs(undefined));
  await module.start(context);
  switchTo(tabs, 2);
  await settle();
  assert.deepEqual(partsOf(dom), ['', 'Tabs']);
  assert.equal(warnings.length, 1);
  module.stop();
});

test('disabled module draws no header', async (t) => {
  installFrames(t);
  const { dom, context, tabs } = setup(TABS(), { api: twoWorkspaces() });
  const { modules } = new ModuleRegistry().register(SpaceHeader).createEnabled({ 'space-header': { enabled: false } });
  assert.equal(modules.length, 0);
  await settle();
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.equal(tabs.listenerCount(), 0);
  assert.equal([1, 2, 3].some((id) => HiddenTabs.of(context.document).has(id)), false);
  assert.equal(SpaceCollapse.of(context.document).collapsed, false);
});

test('asks the folders section for a new folder from the plus button without collapsing the space', async (t) => {
  installFrames(t);
  const { dom, module, context } = setup(TABS(), { api: twoWorkspaces() });
  const asked: string[] = [];
  const stop = FolderCommands.of(context.document).onNewFolder(() => void asked.push('new folder'));
  await module.start(context);
  const add = headerOf(dom)?.children.find((part) => part.hasAttribute('data-vivarcdi-space-add'));
  assert.ok(add);
  assert.equal(add.getAttribute('aria-label'), 'New folder');
  add.click();
  assert.deepEqual(asked, ['new folder']);
  assert.equal(isCollapsed(dom), false);
  stop();
  module.stop();
});
