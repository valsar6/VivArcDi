import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/support/Logger.js';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { createDefaultRegistry } from '../../../src/modules/index.js';
import { GRADIENT_ATTRIBUTE, LOOK_ATTRIBUTE, PALETTE_ATTRIBUTE, SidebarLook } from '../../../src/modules/sidebarlook/SidebarLook.js';
import { asDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';
import { SilentSink } from '../../loader/fakes.js';
import { FolderTabs } from '../folders/fakes.js';
import { BrowserNode, FieldNode, IncognitoDocument, runtimeOf } from '../incognito/fakes.js';
import { settle } from '../reopen/fakes.js';

const SELECTORS = {
  browser: '#browser',
  tabBar: '#tabs-tabbar-container',
  tabListHost: '.list',
  addressField: 'input.address',
};

class LookBrowser extends BrowserNode {
  public override style = {
    setProperty: (name: string, value: string): Map<string, string> => this.properties.set(name, value),
    removeProperty: (name: string): boolean => this.properties.delete(name),
  };
}

class LookDocument extends IncognitoDocument {
  public override browser = new LookBrowser('div', this);
}

interface Setup {
  dom: LookDocument;
  browser: LookBrowser;
  tabs: FolderTabs;
  context: ModuleContext;
}

function setup(t: TestContext, options: Record<string, unknown> = { enabled: true }): Setup {
  const frames = globalThis as unknown as Record<string, unknown>;
  frames['MutationObserver'] = class {
    public observe(): void {}
    public disconnect(): void {}
  };
  t.after(() => delete frames['MutationObserver']);
  const dom = new LookDocument();
  dom.field = new FieldNode('input', dom);
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog(SELECTORS, 'test'),
    logger: new Logger('test', new SilentSink()),
    options,
    tabs,
    runtime: runtimeOf(7, false),
  } as unknown as ModuleContext;
  return { dom, browser: dom.browser, tabs, context };
}

const rowsOf = (dom: LookDocument): DomNode[] => dom.parent.children[0]?.children ?? [];
const COLORS = ['--vivarcdi-space', '--vivarcdi-pill', '--vivarcdi-ink'];
const GRADIENT = 'linear-gradient(135deg, #f3b8ac, #d0c9c5, #8ae3f2)';

test('disabled sidebar look changes nothing', (t) => {
  const { dom, browser } = setup(t, { enabled: false });
  const { modules } = createDefaultRegistry().createEnabled({ 'sidebar-look': { enabled: false } });
  assert.deepEqual(modules, []);
  assert.equal(browser.hasAttribute(LOOK_ATTRIBUTE), false);
  assert.equal(browser.properties.size, 0);
  assert.deepEqual(rowsOf(dom), []);
});

test('the registry starts the sidebar look when it is enabled', () => {
  const { modules } = createDefaultRegistry().createEnabled({ 'sidebar-look': { enabled: true, palette: 'sky' } });
  assert.deepEqual(modules.map(({ id }) => id), ['sidebar-look']);
});

test('uses the arclight palette by default', (t) => {
  const { browser, context } = setup(t);
  new SidebarLook().start(context);
  assert.ok(browser.hasAttribute(LOOK_ATTRIBUTE));
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arclight');
  assert.deepEqual(COLORS.map((name) => browser.properties.get(name)), ['#d0c9c5', '#ffffff', '#212121']);
  assert.ok(browser.hasAttribute(GRADIENT_ATTRIBUTE));
  assert.equal(browser.properties.get('--vivarcdi-gradient'), GRADIENT);
});

test('a palette without a gradient leaves no gradient behind', (t) => {
  const { browser, context } = setup(t, { enabled: true, palette: 'sky' });
  new SidebarLook().start(context);
  assert.equal(browser.hasAttribute(GRADIENT_ATTRIBUTE), false);
  assert.equal(browser.properties.has('--vivarcdi-gradient'), false);
});

test('uses the palette chosen in the options and falls back to arclight for an unknown one', (t) => {
  const lagoon = setup(t, { enabled: true, palette: 'lagoon' });
  new SidebarLook().start(lagoon.context);
  assert.equal(lagoon.browser.properties.get('--vivarcdi-space'), '#8ec5cf');
  const unknown = setup(t, { enabled: true, palette: 'neon' });
  new SidebarLook().start(unknown.context);
  assert.equal(unknown.browser.getAttribute(PALETTE_ATTRIBUTE), 'arclight');
});

test('stop removes the marks, the colors and the row', (t) => {
  const { dom, browser, context } = setup(t);
  const look = new SidebarLook();
  look.start(context);
  assert.equal(rowsOf(dom).length, 1);
  look.stop();
  assert.equal(browser.hasAttribute(LOOK_ATTRIBUTE) || browser.hasAttribute(PALETTE_ATTRIBUTE) || browser.hasAttribute(GRADIENT_ATTRIBUTE), false);
  assert.equal(browser.properties.size, 0);
  assert.deepEqual(rowsOf(dom), []);
  assert.equal(dom.listeners.get('scroll')?.length, 0);
});

test('adds a New Tab row that opens a blank tab and focuses the address field', async (t) => {
  const { dom, tabs, context } = setup(t);
  new SidebarLook().start(context);
  const [row] = rowsOf(dom);
  assert.ok(row?.hasAttribute('data-vivarcdi-new-tab-row'));
  assert.equal(row?.children[1]?.textContent, 'New Tab');
  row?.click();
  await settle();
  assert.deepEqual(tabs.calls, [['create', { windowId: 7 }]]);
  assert.equal(dom.field?.focused, true);
});

test('without chrome.tabs the look still applies and no row is added', (t) => {
  const { dom, browser, context } = setup(t);
  (context as unknown as { tabs: unknown }).tabs = { available: false };
  new SidebarLook().start(context);
  assert.ok(browser.hasAttribute(LOOK_ATTRIBUTE));
  assert.deepEqual(rowsOf(dom), []);
});
