import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../../src/core/BrowserRuntime.js';
import type { RuntimeMessageListener } from '../../../src/core/BrowserTabs.js';
import { Logger } from '../../../src/core/Logger.js';
import type { ModuleContext } from '../../../src/core/Module.js';
import { SelectorCatalog } from '../../../src/core/SelectorCatalog.js';
import { COPY_CONSOLE_PREFIX, COPY_MESSAGE_TYPE } from '../../../src/modules/copyurl/CopyMessage.js';
import { COPIED_TEXT, CopyUrl, FAILED_TEXT } from '../../../src/modules/copyurl/CopyUrl.js';
import { TOAST_ATTRIBUTE } from '../../../src/modules/copyurl/Toast.js';
import { FakeLoader, SilentSink } from '../../loader/fakes.js';
import { FakeTabs } from '../favorites/fakes.js';
import { event } from '../pinned/fakes.js';
import type { FakeEvent as KeyEvent } from '../pinned/fakes.js';
import { FakeElement, FakeEvent } from '../peek/fakes.js';
import { CopyDocument, FakeClipboard } from './fakes.js';

class FakeObserver {
  public static active = 0;

  public observe(): void {
    FakeObserver.active += 1;
  }

  public disconnect(): void {
    FakeObserver.active -= 1;
  }
}

let savedObserver: unknown;

beforeEach(() => {
  savedObserver = Reflect.get(globalThis, 'MutationObserver');
  Object.assign(globalThis, { MutationObserver: FakeObserver });
});

afterEach(() => Object.assign(globalThis, { MutationObserver: savedObserver }));

const selectors = new SelectorCatalog(
  { browser: '#browser', webviewContainer: '#webview-container', tabWebview: '#webview-container webview[tab_id]' },
  'test',
);
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const URL = 'https://active.example/';

interface Setup {
  context: ModuleContext;
  document: CopyDocument;
  browser: FakeElement;
  webview: FakeElement;
  messages: FakeEvent<RuntimeMessageListener>;
  clipboard: FakeClipboard;
  sink: SilentSink;
}

function setUp(): Setup {
  const webview = new FakeElement('webview', { tab_id: '2' });
  const container = new FakeElement('div');
  container.append(webview);
  const browser = new FakeElement('div');
  const clipboard = new FakeClipboard();
  const document = new CopyDocument({ '#browser': browser, '#webview-container': container }, clipboard);
  const messages = new FakeEvent<RuntimeMessageListener>();
  const active = { id: 2, active: true, currentWindow: true, url: URL };
  const sink = new SilentSink();
  const context = {
    document,
    selectors,
    logger: new Logger('test', sink),
    options: {},
    tabs: new FakeTabs([active]),
    runtime: new BrowserRuntime({ runtime: { onMessage: messages } }),
    payload: new FakeLoader({ 'page/copy-keys.js': 'KEYS' }),
    build: { vivarcdiVersion: 'test', vivaldiVersion: '8.1' },
  } as unknown as ModuleContext;
  return { context, document, browser, webview, messages, clipboard, sink };
}

async function started(): Promise<Setup & { module: CopyUrl }> {
  const setup = setUp();
  const module = new CopyUrl();
  await module.start(setup.context);
  await settle();
  return { ...setup, module };
}

function press(document: CopyDocument, fields: Partial<KeyEvent>): KeyEvent {
  const key = event('keydown', fields);
  document.root.listeners.get('keydown')?.forEach((listener) => listener(key as unknown as Event));
  return key;
}

function tokenOf(code: string | undefined): string {
  const policy = /install\((.*)\);$/.exec(code ?? '')?.[1] ?? '{}';
  return String((JSON.parse(policy) as { token?: string }).token);
}

const toastOf = (browser: FakeElement): FakeElement | undefined => browser.children.find((child) => child.hasAttribute(TOAST_ATTRIBUTE));

test('copy shortcut in the interface copies the active address and shows a toast', async () => {
  const { module, document, browser, clipboard } = await started();
  const mac = press(document, { key: 'c', metaKey: true, shiftKey: true });
  const other = press(document, { key: 'C', ctrlKey: true, shiftKey: true });
  await settle();
  assert.deepEqual(clipboard.written, [URL, URL]);
  assert.ok([mac, other].every((key) => key.defaultPrevented && key.stopped));
  assert.equal(toastOf(browser)?.textContent, COPIED_TEXT);
  module.stop();
});

test('copy shortcut ignores other keys and keys already handled', async () => {
  const { module, document, clipboard } = await started();
  const plain = press(document, { key: 'c', metaKey: true });
  const withAlt = press(document, { key: 'c', metaKey: true, shiftKey: true, altKey: true });
  const otherLetter = press(document, { key: 'a', metaKey: true, shiftKey: true });
  const handled = press(document, { key: 'c', metaKey: true, shiftKey: true, defaultPrevented: true });
  await settle();
  assert.deepEqual(clipboard.written, []);
  assert.ok([plain, withAlt, otherLetter].every((key) => !key.defaultPrevented && !key.stopped));
  assert.equal(handled.stopped, false);
  module.stop();
});

test('copy module injects the page script and copies for messages with its token only', async () => {
  const { module, webview, messages, clipboard } = await started();
  const code = webview.executed[0] ?? '';
  assert.match(code, /^KEYS\nVivArcDiCopyKeys\.install\(/);
  assert.match(code, /"tabId":2/);
  const message = (token: string): object => ({ type: COPY_MESSAGE_TYPE, token, tabId: 2, action: 'copy' });
  messages.listeners.forEach((listener) => listener(message('forged')));
  webview.dispatch('consolemessage', { message: `${COPY_CONSOLE_PREFIX}${JSON.stringify(message('forged'))}` });
  await settle();
  assert.deepEqual(clipboard.written, []);
  messages.listeners.forEach((listener) => listener(message(tokenOf(code))));
  webview.dispatch('consolemessage', { message: `${COPY_CONSOLE_PREFIX}${JSON.stringify(message(tokenOf(code)))}` });
  await settle();
  assert.deepEqual(clipboard.written, [URL, URL]);
  module.stop();
});

test('copy module shows a failure toast and logs when the copy is refused', async () => {
  const { module, document, browser, clipboard, sink } = await started();
  clipboard.refuse = true;
  document.commandWorks = false;
  press(document, { key: 'c', metaKey: true, shiftKey: true });
  await settle();
  assert.equal(toastOf(browser)?.textContent, FAILED_TEXT);
  assert.ok(sink.lines.some(([level]) => level === 'error'));
  module.stop();
});

test('copy module removes its listeners, page script and toast on stop', async () => {
  const { module, document, browser, webview, messages } = await started();
  press(document, { key: 'c', metaKey: true, shiftKey: true });
  await settle();
  module.stop();
  assert.equal(toastOf(browser), undefined);
  assert.equal(document.root.listenerCount(), 0);
  assert.equal(webview.listenerCount(), 0);
  assert.equal(webview.executed.at(-1), 'globalThis.VivArcDiCopyKeys?.uninstall();');
  assert.equal(messages.listeners.size, 0);
  assert.equal(FakeObserver.active, 0);
});

test('copy module stays off without chrome.tabs', async () => {
  const { context, document, webview } = setUp();
  await new CopyUrl().start({ ...context, tabs: { available: false } } as unknown as ModuleContext);
  assert.equal(document.root.listenerCount(), 0);
  assert.deepEqual(webview.executed, []);
});

test('copy settings keep the toast between half a second and ten seconds', () => {
  assert.deepEqual(CopyUrl.settingsFrom({}), { toastMs: 2000 });
  assert.deepEqual(CopyUrl.settingsFrom({ toastMs: 100 }), { toastMs: 500 });
  assert.deepEqual(CopyUrl.settingsFrom({ toastMs: 60000 }), { toastMs: 10000 });
  assert.deepEqual(CopyUrl.settingsFrom({ toastMs: 'soon' }), { toastMs: 2000 });
});
