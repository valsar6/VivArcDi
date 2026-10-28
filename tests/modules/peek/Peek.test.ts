import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import type { RuntimeMessageListener } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { OPEN_ATTRIBUTE, Peek } from '../../../src/modules/peek/Peek.js';
import { PEEK_MESSAGE_TYPE } from '../../../src/modules/peek/PeekMessage.js';
import { FakeLoader, SilentSink } from '../../loader/fakes.js';
import { FakeTabs } from '../favorites/fakes.js';
import { FakeDocument, FakeElement, FakeEvent } from './fakes.js';

class FakeObserver {
  public static active = 0;

  public observe(): void {
    FakeObserver.active += 1;
  }

  public disconnect(): void {
    FakeObserver.active -= 1;
  }
}

class ActivatableTabs extends FakeTabs {
  public activatedListeners = new Set<() => void>();

  public onActivated(listener: () => void): () => void {
    this.activatedListeners.add(listener);
    return () => this.activatedListeners.delete(listener);
  }
}

let savedObserver: unknown;

beforeEach(() => {
  savedObserver = Reflect.get(globalThis, 'MutationObserver');
  Object.assign(globalThis, { MutationObserver: FakeObserver });
});

afterEach(() => Object.assign(globalThis, { MutationObserver: savedObserver }));

const selectors = new SelectorCatalog(
  { webviewContainer: '#webview-container', tabWebview: '#webview-container webview[tab_id]' },
  'test',
);
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function setUp(tab: { pinned?: boolean; vivExtData?: string } = { pinned: true }): {
  context: ModuleContext;
  document: FakeDocument;
  container: FakeElement;
  webview: FakeElement;
  messages: FakeEvent<RuntimeMessageListener>;
  tabs: ActivatableTabs;
} {
  const webview = new FakeElement('webview', { tab_id: '1', partition: 'persist:vivaldi' });
  const container = new FakeElement('div');
  container.append(webview);
  const document = new FakeDocument({ '#webview-container': container });
  const messages = new FakeEvent<RuntimeMessageListener>();
  const tabs = new ActivatableTabs([{ ...tab, id: 1, index: 0, windowId: 1 }]);
  const context = {
    document,
    selectors,
    logger: new Logger('test', new SilentSink()),
    options: {},
    tabs,
    runtime: new BrowserRuntime({ runtime: { onMessage: messages } }),
    payload: new FakeLoader({ 'page/peek-links.js': 'LINKS', 'page/peek-keys.js': 'KEYS' }),
    build: { vivarcdiVersion: 'test', vivaldiVersion: '8.1' },
  } as unknown as ModuleContext;
  return { context, document, container, webview, messages, tabs };
}

function tokenOf(code: string | undefined): string {
  const policy = /install\((.*)\);$/.exec(code ?? '')?.[1] ?? '{}';
  return String((JSON.parse(policy) as { token?: string }).token);
}

test('peek module injects the page script with the tab policy', async () => {
  const { context, webview } = setUp();
  const peek = new Peek();
  await peek.start(context);
  await settle();
  const code = webview.executed[0] ?? '';
  assert.match(code, /^LINKS\nVivArcDiPeekLinks\.install\(/);
  assert.match(code, /"pinned":true,"tabId":1/);
  peek.stop();
});

test('peek module gives the tab of a folder link the policy of a pinned tab', async () => {
  const { context, webview } = setUp({ vivExtData: JSON.stringify({ vivarcdi: { bookmarkId: '11' } }) });
  const peek = new Peek();
  await peek.start(context);
  await settle();
  assert.match(webview.executed[0] ?? '', /"pinned":true,"tabId":1/);
  peek.stop();
});

test('peek module opens a panel for a message with its token only', async () => {
  const { context, container, webview, messages } = setUp();
  const peek = new Peek();
  await peek.start(context);
  await settle();
  const send = (token: string): void =>
    messages.listeners.forEach((listener) =>
      listener({ type: PEEK_MESSAGE_TYPE, token, action: 'open', url: 'https://b.example/', tabId: 1, disposition: 'same-tab' }),
    );
  send('forged');
  assert.equal(container.hasAttribute(OPEN_ATTRIBUTE), false);
  send(tokenOf(webview.executed[0]));
  assert.ok(container.hasAttribute(OPEN_ATTRIBUTE));
  const page = container.descendants().find((element) => element.tagName === 'webview' && element !== webview);
  assert.equal(page?.src, 'https://b.example/');
  assert.equal(page?.getAttribute('partition'), 'persist:vivaldi');
  peek.stop();
});

test('peek module cleans up on stop', async () => {
  const { context, document, container, webview, messages, tabs } = setUp();
  const peek = new Peek();
  await peek.start(context);
  await settle();
  messages.listeners.forEach((listener) =>
    listener({
      type: PEEK_MESSAGE_TYPE,
      token: tokenOf(webview.executed[0]),
      action: 'open',
      url: 'https://b.example/',
      tabId: 1,
      disposition: 'same-tab',
    }),
  );
  assert.equal(container.children.length, 3);
  peek.stop();
  assert.deepEqual(container.children, [webview]);
  assert.equal(container.hasAttribute(OPEN_ATTRIBUTE), false);
  assert.equal(webview.listenerCount(), 0);
  assert.equal(webview.executed.at(-1), 'globalThis.VivArcDiPeekLinks?.uninstall();');
  assert.equal(document.root.listenerCount(), 0);
  assert.equal(messages.listeners.size, 0);
  assert.equal(tabs.listeners.size, 0);
  assert.equal(tabs.activatedListeners.size, 0);
  assert.equal(FakeObserver.active, 0);
});

test('peek module stays off without chrome.tabs', async () => {
  const { context, webview } = setUp();
  await new Peek().start({ ...context, tabs: { available: false } } as unknown as ModuleContext);
  assert.deepEqual(webview.executed, []);
});

test('peek settings keep sizes between 40 and 100 percent', () => {
  const settings = Peek.settingsFrom({ widthPercent: 10, heightPercent: 300, anyCrossSite: true });
  assert.deepEqual(settings, {
    shiftClick: true,
    pinnedCrossSite: true,
    anyCrossSite: true,
    widthPercent: 40,
    heightPercent: 100,
  });
});
