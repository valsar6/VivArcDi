import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../../src/core/browser/BrowserRuntime.js';
import type { RuntimeMessageListener } from '../../../src/core/browser/BrowserTabs.js';
import { Logger } from '../../../src/core/support/Logger.js';
import type { ModuleContext } from '../../../src/core/boot/Module.js';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import { CALL_CONSOLE_PREFIX, CALL_MESSAGE_TYPE, parseCallMessage } from '../../../src/modules/callpip/CallMessage.js';
import { CallPip } from '../../../src/modules/callpip/CallPip.js';
import { CALL_PIP_OPTIONS } from '../../../src/modules/callpip/CallPipOptions.js';
import type { CallPipOptions } from '../../../src/modules/callpip/CallPipOptions.js';
import { FakeLoader, SilentSink } from '../../loader/fakes.js';
import { FakeTabs } from '../favorites/fakes.js';
import { FakeElement, FakeEvent } from '../peek/fakes.js';
import { CopyDocument } from '../copyurl/fakes.js';

class FakeObserver {
  public observe(): void {}

  public disconnect(): void {}
}

let savedObserver: unknown;

beforeEach(() => {
  savedObserver = Reflect.get(globalThis, 'MutationObserver');
  Object.assign(globalThis, { MutationObserver: FakeObserver });
});

afterEach(() => Object.assign(globalThis, { MutationObserver: savedObserver }));

const selectors = new SelectorCatalog(
  {
    browser: '#browser',
    webviewContainer: '#webview-container',
    tabWebview: '#webview-container webview[tab_id]',
    callMeetInCall: 'button[jsname="CQylAd"]',
  },
  'test',
);
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const MEET = 'https://meet.google.com/abc-defg-hij';

interface Setup {
  context: ModuleContext<CallPipOptions>;
  webviews: FakeElement[];
  messages: FakeEvent<RuntimeMessageListener>;
  sink: SilentSink;
}

function setUp(urls: string[], options: Partial<CallPipOptions> = {}): Setup {
  const webviews = urls.map((_url, index) => new FakeElement('webview', { tab_id: String(index + 1) }));
  const container = new FakeElement('div');
  webviews.forEach((webview) => container.append(webview));
  const document = new CopyDocument({ '#browser': new FakeElement('div'), '#webview-container': container });
  const messages = new FakeEvent<RuntimeMessageListener>();
  const sink = new SilentSink();
  const tabs = new FakeTabs(urls.map((url, index) => ({ id: index + 1, active: index === 0, currentWindow: true, url })));
  const context = {
    document,
    selectors,
    logger: new Logger('test', sink),
    options: { ...CALL_PIP_OPTIONS.defaults, ...options },
    tabs,
    runtime: new BrowserRuntime({ runtime: { onMessage: messages } }),
    payload: new FakeLoader({ 'page/call-pip.js': 'CALL' }),
    build: { vivarcdiVersion: 'test', vivaldiVersion: '8.1' },
  } as unknown as ModuleContext<CallPipOptions>;
  return { context, webviews, messages, sink };
}

async function started(urls: string[], options: Partial<CallPipOptions> = {}): Promise<Setup & { module: CallPip }> {
  const setup = setUp(urls, options);
  const module = new CallPip();
  await module.start(setup.context);
  await settle();
  return { ...setup, module };
}

function tokenOf(code: string | undefined): string {
  const policy = /install\((.*)\);$/.exec(code ?? '')?.[1] ?? '{}';
  return String((JSON.parse(policy) as { token?: string }).token);
}

test('injects the call script on the supported sites only', async () => {
  const { module, webviews } = await started([MEET, 'https://example.com/', 'http://meet.google.com/abc', 'https://notmeet.google.com.evil.example/']);
  const code = webviews[0]?.executed[0] ?? '';
  assert.match(code, /^CALL\nVivArcDiCallPip\.install\(/);
  assert.match(code, /"tabId":1/);
  assert.match(code, /"letter":"p"/);
  assert.match(code, /"inCallSelector":"button\[jsname=\\"CQylAd\\"\]"/);
  assert.deepEqual(webviews.slice(1).map((webview) => webview.executed.at(-1)), [
    'globalThis.VivArcDiCallPip?.uninstall();',
    'globalThis.VivArcDiCallPip?.uninstall();',
    'globalThis.VivArcDiCallPip?.uninstall();',
  ]);
  module.stop();
});

test('skips a disabled site', async () => {
  const { module, webviews } = await started([MEET], { meet: false });
  assert.deepEqual(webviews[0]?.executed, ['globalThis.VivArcDiCallPip?.uninstall();']);
  module.stop();
});

test('uses the configured shortcut letter in the page script', async () => {
  const { module, webviews } = await started([MEET], { shortcutLetter: 'k' });
  assert.match(webviews[0]?.executed[0] ?? '', /"letter":"k"/);
  module.stop();
});

test('does not run in private windows', () => {
  assert.equal(CallPip.privateWindows, 'never');
});

test('logs a warning for messages with its token only', async () => {
  const { module, webviews, messages, sink } = await started([MEET]);
  const token = tokenOf(webviews[0]?.executed[0]);
  const message = (value: string): object => ({ type: CALL_MESSAGE_TYPE, token: value, tabId: 1, reason: 'request-failed' });
  messages.listeners.forEach((listener) => listener(message('forged')));
  webviews[0]?.dispatch('consolemessage', { message: `${CALL_CONSOLE_PREFIX}${JSON.stringify(message(token))}` });
  await settle();
  const warnings = sink.lines.filter(([level]) => level === 'warn');
  assert.equal(warnings.length, 1);
  module.stop();
});

test('removes the page script and the listeners on stop', async () => {
  const { module, webviews, messages } = await started([MEET]);
  module.stop();
  assert.equal(webviews[0]?.listenerCount(), 0);
  assert.equal(webviews[0]?.executed.at(-1), 'globalThis.VivArcDiCallPip?.uninstall();');
  assert.equal(messages.listeners.size, 0);
});

test('stays off without chrome.tabs', async () => {
  const { context, webviews } = setUp([MEET]);
  await new CallPip().start({ ...context, tabs: { available: false } } as unknown as ModuleContext<CallPipOptions>);
  assert.deepEqual(webviews[0]?.executed, []);
});

test('reads call messages and refuses anything else', () => {
  const valid = { type: CALL_MESSAGE_TYPE, token: 't', tabId: 1, reason: 'unsupported-page' };
  assert.deepEqual(parseCallMessage(valid), valid);
  assert.deepEqual(parseCallMessage(`${CALL_CONSOLE_PREFIX}${JSON.stringify(valid)}`), valid);
  assert.equal(parseCallMessage({ ...valid, reason: 'other' }), null);
  assert.equal(parseCallMessage({ ...valid, type: 'x' }), null);
  assert.equal(parseCallMessage(`${CALL_CONSOLE_PREFIX}{`), null);
  assert.equal(parseCallMessage(null), null);
});

test('call settings default to Meet on and the letter p', () => {
  const check = (raw: Record<string, unknown>): CallPipOptions | null => CALL_PIP_OPTIONS.check(raw, { warn: (): void => undefined });
  assert.deepEqual(check({}), { meet: true, shortcutLetter: 'p' });
  assert.deepEqual(check({ meet: false, shortcutLetter: 'k' }), { meet: false, shortcutLetter: 'k' });
  assert.deepEqual(check({ shortcutLetter: '  ' }), { meet: true, shortcutLetter: 'p' });
});
