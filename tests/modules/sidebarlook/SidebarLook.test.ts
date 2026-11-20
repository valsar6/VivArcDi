import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../../src/core/support/Logger.js';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { createDefaultRegistry } from '../../../src/modules/index.js';
import { BrowserPrefs } from '../../../src/core/browser/BrowserPrefs.js';
import { GRADIENT_ATTRIBUTE, LOOK_ATTRIBUTE, PALETTE_ATTRIBUTE } from '../../../src/modules/sidebarlook/LookMarks.js';
import { SidebarLook } from '../../../src/modules/sidebarlook/SidebarLook.js';
import { asDocument } from '../../core/dom.js';
import { FakePrefsApi } from '../../core/prefs.js';
import type { DomNode } from '../../core/dom.js';
import { SIDEBAR_LOOK_OPTIONS } from '../../../src/modules/sidebarlook/SidebarLookOptions.js';
import type { SidebarLookOptions } from '../../../src/modules/sidebarlook/SidebarLookOptions.js';
import { SilentSink, silentNotices } from '../../loader/fakes.js';
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
    getPropertyValue: (name: string): string => this.properties.get(name) ?? '',
  };
}

class LookDocument extends IncognitoDocument {
  public override browser = new LookBrowser('div', this);
}

const THEME_KEY = 'vivaldi.themes.current';

class FakeObserver {
  public static all: FakeObserver[] = [];
  public disconnected = false;
  public watchesAttributes = false;

  constructor(public callback: () => void) {
    FakeObserver.all.push(this);
  }

  public static fireAttributeWatchers(): void {
    FakeObserver.all.filter((observer) => observer.watchesAttributes).forEach((observer) => observer.callback());
  }

  public observe(_target: unknown, options: { attributeFilter?: string[] } = {}): void {
    this.watchesAttributes = options.attributeFilter !== undefined;
  }

  public disconnect(): void {
    this.disconnected = true;
  }
}

interface Setup {
  prefsApi: FakePrefsApi;
  dom: LookDocument;
  browser: LookBrowser;
  tabs: FolderTabs;
  context: ModuleContext<SidebarLookOptions>;
}

function setup(t: TestContext, options: Partial<SidebarLookOptions> = {}, themeId?: string): Setup {
  const frames = globalThis as unknown as Record<string, unknown>;
  FakeObserver.all = [];
  frames['MutationObserver'] = FakeObserver;
  t.after(() => delete frames['MutationObserver']);
  const prefsApi = new FakePrefsApi();
  if (themeId !== undefined) {
    prefsApi.values.set(THEME_KEY, themeId);
  }
  const dom = new LookDocument();
  dom.field = new FieldNode('input', dom);
  const tabs = new FolderTabs([{ id: 1, active: true }]);
  const context = {
    document: asDocument(dom),
    selectors: new SelectorCatalog(SELECTORS, 'test'),
    logger: new Logger('test', new SilentSink()),
    options: { ...SIDEBAR_LOOK_OPTIONS.defaults, ...options },
    tabs,
    prefs: new BrowserPrefs(prefsApi),
    runtime: runtimeOf(7, false),
    notices: silentNotices(),
  } as unknown as ModuleContext<SidebarLookOptions>;
  return { prefsApi, dom, browser: dom.browser, tabs, context };
}

const rowsOf = (dom: LookDocument): DomNode[] => dom.parent.children[0]?.children ?? [];
const COLORS = ['--vivarcdi-space', '--vivarcdi-pill', '--vivarcdi-ink'];
const GRADIENT = 'linear-gradient(135deg, #f3b8ac, #d0c9c5, #8ae3f2)';

test('disabled sidebar look changes nothing', (t) => {
  const { dom, browser } = setup(t);
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

test('uses the arclight palette by default', async (t) => {
  const { browser, context } = setup(t);
  await new SidebarLook().start(context);
  assert.ok(browser.hasAttribute(LOOK_ATTRIBUTE));
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arclight');
  assert.deepEqual(COLORS.map((name) => browser.properties.get(name)), ['#d0c9c5', '#ffffff', '#212121']);
  assert.ok(browser.hasAttribute(GRADIENT_ATTRIBUTE));
  assert.equal(browser.properties.get('--vivarcdi-gradient'), GRADIENT);
});

test('a palette without a gradient leaves no gradient behind', async (t) => {
  const { browser, context } = setup(t, { palette: 'sky' });
  await new SidebarLook().start(context);
  assert.equal(browser.hasAttribute(GRADIENT_ATTRIBUTE), false);
  assert.equal(browser.properties.has('--vivarcdi-gradient'), false);
});

test('uses the palette chosen in the options and falls back to arclight for an unknown one', async (t) => {
  const lagoon = setup(t, { palette: 'lagoon' });
  await new SidebarLook().start(lagoon.context);
  assert.equal(lagoon.browser.properties.get('--vivarcdi-space'), '#8ec5cf');
  const checked = SIDEBAR_LOOK_OPTIONS.check({ palette: 'neon' }, { warn: (): void => undefined });
  const unknown = setup(t, checked ?? {});
  await new SidebarLook().start(unknown.context);
  assert.equal(unknown.browser.getAttribute(PALETTE_ATTRIBUTE), 'arclight');
});

test('stop removes the marks, the colors and the row', async (t) => {
  const { dom, browser, context } = setup(t);
  const look = new SidebarLook();
  await look.start(context);
  assert.equal(rowsOf(dom).length, 1);
  look.stop();
  assert.equal(browser.hasAttribute(LOOK_ATTRIBUTE) || browser.hasAttribute(PALETTE_ATTRIBUTE) || browser.hasAttribute(GRADIENT_ATTRIBUTE), false);
  assert.equal(browser.properties.size, 0);
  assert.deepEqual(rowsOf(dom), []);
  assert.equal(dom.listeners.get('scroll')?.length, 0);
});

test('adds a New Tab row that opens a blank tab and focuses the address field', async (t) => {
  const { dom, tabs, context } = setup(t);
  await new SidebarLook().start(context);
  const [row] = rowsOf(dom);
  assert.ok(row?.hasAttribute('data-vivarcdi-new-tab-row'));
  assert.equal(row?.children[1]?.textContent, 'New Tab');
  row?.click();
  await settle();
  assert.deepEqual(tabs.calls, [['create', { windowId: 7 }]]);
  assert.equal(dom.field?.focused, true);
});

test('without chrome.tabs the look still applies and no row is added', async (t) => {
  const { dom, browser, context } = setup(t);
  (context as unknown as { tabs: unknown }).tabs = { available: false };
  await new SidebarLook().start(context);
  assert.ok(browser.hasAttribute(LOOK_ATTRIBUTE));
  assert.deepEqual(rowsOf(dom), []);
});

test('theme apply selects the matching palette', async (t) => {
  const { browser, context } = setup(t, {}, 'vivarcdi-pink');
  await new SidebarLook().start(context);
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arcpink');
  assert.equal(browser.properties.get('--vivarcdi-gradient'), 'linear-gradient(180deg, #d8b5dd, #ead0dd, #f7e4d6)');
});

test('a dark theme paints the dark palette without a gradient when it is flat', async (t) => {
  const { browser, context } = setup(t, {}, 'vivarcdi-pure-dark');
  await new SidebarLook().start(context);
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arcdarkpure');
  assert.equal(browser.hasAttribute(GRADIENT_ATTRIBUTE), false);
  assert.equal(browser.properties.get('--vivarcdi-ink'), '#f2f2f2');
});

test('follows a change of the theme and falls back to the option for another theme', async (t) => {
  const { prefsApi, browser, context } = setup(t, { palette: 'sky' }, 'vivarcdi-green');
  const look = new SidebarLook();
  await look.start(context);
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arcgreen');
  prefsApi.set(THEME_KEY, 'vivarcdi-dark');
  await settle();
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arcdark');
  prefsApi.set(THEME_KEY, 'Vivaldi1');
  await settle();
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'sky');
  look.stop();
  assert.equal(prefsApi.listeners.size, 0);
});

test('uses the palette option when the preferences cannot be read', async (t) => {
  const { browser, context } = setup(t, { palette: 'ice' }, 'vivarcdi-pink');
  (context as unknown as { prefs: unknown }).prefs = new BrowserPrefs(undefined);
  await new SidebarLook().start(context);
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'ice');
});

test('palette stays applied with the ui hidden', async (t) => {
  const { browser, context } = setup(t, {}, 'vivarcdi-dark');
  const look = new SidebarLook();
  await look.start(context);
  browser.removeAttribute(LOOK_ATTRIBUTE);
  browser.removeAttribute(PALETTE_ATTRIBUTE);
  browser.properties.clear();
  FakeObserver.fireAttributeWatchers();
  assert.ok(browser.hasAttribute(LOOK_ATTRIBUTE));
  assert.equal(browser.getAttribute(PALETTE_ATTRIBUTE), 'arcdark');
  assert.equal(browser.properties.get('--vivarcdi-space'), '#501d3c');
  assert.ok(browser.hasAttribute(GRADIENT_ATTRIBUTE));
  look.stop();
  assert.ok(FakeObserver.all.filter((observer) => observer.watchesAttributes).every((observer) => observer.disconnected));
  assert.equal(browser.properties.size, 0);
});

test('an untouched look is not painted again when the browser changes', async (t) => {
  const { browser, context } = setup(t);
  await new SidebarLook().start(context);
  let writes = 0;
  const original = browser.style.setProperty;
  browser.style.setProperty = (name: string, value: string): Map<string, string> => {
    writes += 1;
    return original(name, value);
  };
  FakeObserver.fireAttributeWatchers();
  assert.equal(writes, 0);
});
