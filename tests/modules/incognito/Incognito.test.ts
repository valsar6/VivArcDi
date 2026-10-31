import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { Incognito } from '../../../src/modules/incognito/Incognito.js';
import { asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { SilentSink } from '../../loader/fakes.js';
import { FolderTabs } from '../folders/fakes.js';
import { settle } from '../reopen/fakes.js';
import { FieldNode, IncognitoDocument, runtimeOf } from './fakes.js';

const SELECTORS = {
  browser: '#browser',
  tabListHost: '.list',
  tabsContainer: '#tabs-container',
  addressField: 'input.address',
  newTabButton: '.newtab',
  workspaceButton: '.workspace',
};

interface Setup {
  dom: IncognitoDocument;
  module: Incognito;
  tabs: FolderTabs;
  sink: SilentSink;
  writes: string[];
  context: ModuleContext;
  downloads: ReturnType<IncognitoDocument['button']>;
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

function setup(t: TestContext, tabs = new FolderTabs([{ id: 1, active: false }, { id: 2, active: true }, { id: 3, active: false }])): Setup {
  installFrames(t);
  const dom = new IncognitoDocument();
  dom.field = new FieldNode('input', dom);
  const downloads = dom.button('Trasferimenti (⌥⌘L)');
  const sink = new SilentSink();
  const writes: string[] = [];
  const storage = {
    getItem: (): null => null,
    setItem: (key: string): void => {
      writes.push(key);
      throw new Error('storage must not be written');
    },
  };
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog(SELECTORS, 'test'),
    logger: new Logger('test', sink),
    options: { enabled: true },
    tabs,
    runtime: runtimeOf(1),
    storage,
  } as unknown as ModuleContext;
  return { dom, module: new Incognito(), tabs, sink, writes, context, downloads };
}

const rowsOf = (dom: IncognitoDocument): DomNode[] => dom.parent.children[0]?.children ?? [];
const barOf = (dom: IncognitoDocument): DomNode | undefined => dom.list.children.at(-1);

test('draws the private tab bar', (t) => {
  const { dom, module, context } = setup(t);
  const newTab = dom.vivaldiButton('.newtab');
  const workspace = dom.vivaldiButton('.workspace');
  module.start(context);
  assert.equal(dom.browser.dataset['vivarcdiPrivate'], '');
  const [header, row] = rowsOf(dom);
  assert.ok(header);
  assert.ok(header.hasAttribute('data-vivarcdi-incognito-header'));
  assert.deepEqual(header.children.map((part) => part.textContent), ['Incognito Tabs', 'Clear']);
  assert.ok(row);
  assert.ok(row.hasAttribute('data-vivarcdi-new-tab-row'));
  assert.equal(row.children[1]?.textContent, 'New Tab');
  const bar = barOf(dom);
  assert.ok(bar);
  assert.ok(bar.hasAttribute('data-vivarcdi-bottom-bar'));
  assert.deepEqual(bar.children.map((button) => button.getAttribute('data-vivarcdi-bar-button')), ['library', 'plus']);
  assert.ok(newTab.hasAttribute('data-vivarcdi-private-hidden') && workspace.hasAttribute('data-vivarcdi-private-hidden'));
});

test('new tab row opens a blank tab and focuses the address field', async (t) => {
  const { dom, module, context, tabs } = setup(t);
  module.start(context);
  rowsOf(dom)[1]?.click();
  await settle();
  assert.deepEqual(tabs.calls, [['create', { windowId: 1 }]]);
  assert.equal(dom.field?.focused, true);
  assert.equal(dom.field.selected, true);
});

test('plus opens a blank tab and focuses the address field', async (t) => {
  const { dom, module, context, tabs } = setup(t);
  module.start(context);
  barOf(dom)?.children[1]?.click();
  await settle();
  assert.deepEqual(tabs.calls, [['create', { windowId: 1 }]]);
  assert.equal(dom.field?.focused, true);
  assert.equal(dom.field.selected, true);
});

test('library clicks the downloads button', (t) => {
  const { dom, module, context, downloads, sink } = setup(t);
  module.start(context);
  barOf(dom)?.children[0]?.click();
  assert.equal(downloads.clicks, 1);
  assert.deepEqual(sink.lines, []);
});

test('warns when the downloads button is missing', (t) => {
  const { dom, module, context, sink } = setup(t);
  dom.found.delete('button[title]');
  module.start(context);
  barOf(dom)?.children[0]?.click();
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});

test('clear in the header closes the other tabs and writes nothing', async (t) => {
  const { dom, module, context, tabs, writes } = setup(t);
  module.start(context);
  rowsOf(dom)[0]?.children[1]?.click();
  await settle();
  assert.deepEqual([...tabs.tabs.keys()], [2]);
  assert.deepEqual(writes, []);
});

test('logs a failure of an action and keeps working', async (t) => {
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  const { dom, module, context, sink } = setup(t, tabs);
  context.runtime.currentWindowId = (): Promise<number> => Promise.reject(new Error('no window'));
  module.start(context);
  rowsOf(dom)[1]?.click();
  await settle();
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});

test('stop removes the mark, the rows, the bottom bar and the hidden marks', (t) => {
  const { dom, module, context } = setup(t);
  const newTab = dom.vivaldiButton('.newtab');
  module.start(context);
  module.stop();
  assert.equal('vivarcdiPrivate' in dom.browser.dataset, false);
  assert.deepEqual(dom.parent.children, [dom.list]);
  assert.deepEqual(dom.list.children, []);
  assert.equal(newTab.hasAttribute('data-vivarcdi-private-hidden'), false);
});

test('stays off without chrome.tabs', (t) => {
  const { dom, module, context, sink } = setup(t);
  (context.tabs as unknown as { available: boolean }).available = false;
  module.start(context);
  assert.equal('vivarcdiPrivate' in dom.browser.dataset, false);
  assert.equal(sink.lines.length, 1);
});

test('stays off and warns when the tab bar is missing', (t) => {
  const { dom, module, context, sink } = setup(t);
  dom.list.remove();
  module.start(context);
  assert.equal('vivarcdiPrivate' in dom.browser.dataset, false);
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});
