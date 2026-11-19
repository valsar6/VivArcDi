import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../../src/core/browser/BrowserRuntime.js';
import { PageScriptInjector } from '../../../src/core/browser/PageScriptInjector.js';
import { TAB_CLOSED_ERROR } from '../../../src/core/browser/ScriptRunner.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { SilentSink } from '../../loader/fakes.js';
import { FakeElement, answer } from '../../modules/peek/fakes.js';

class FakeObserver {
  public observe(): void {}

  public disconnect(): void {}
}

interface Deferred {
  resolve: (code: string | null) => void;
  promise: Promise<string | null>;
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function deferred(): Deferred {
  let resolve: (code: string | null) => void = () => undefined;
  const promise = new Promise<string | null>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

function setUp(webviewCount = 1): {
  injector: PageScriptInjector;
  container: FakeElement;
  webviews: FakeElement[];
  host: { runtime: { lastError?: { message: string } | undefined } };
  sink: SilentSink;
  requests: Deferred[];
} {
  const container = new FakeElement('div');
  const webviews = Array.from({ length: webviewCount }, (_unused, index) => new FakeElement('webview', { tab_id: String(index + 1) }));
  container.append(...webviews);
  const host: { runtime: { lastError?: { message: string } | undefined } } = { runtime: {} };
  const sink = new SilentSink();
  const requests: Deferred[] = [];
  const injector = new PageScriptInjector({
    container: container as unknown as Element,
    webviewSelector: 'webview[tab_id]',
    scriptFor: (): Promise<string | null> => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
    uninstallScript: 'UNINSTALL',
    purpose: 'test scripts',
    onConsoleMessage: (): void => undefined,
    errors: new BrowserRuntime(host),
    logger: new Logger('test', sink),
  });
  return { injector, container, webviews, host, sink, requests };
}

let savedObserver: unknown;

beforeEach(() => {
  savedObserver = Reflect.get(globalThis, 'MutationObserver');
  Object.assign(globalThis, { MutationObserver: FakeObserver });
});

afterEach(() => Object.assign(globalThis, { MutationObserver: savedObserver }));

const lines = (sink: SilentSink, level: string): unknown[][] => sink.lines.filter(([kind]) => kind === level);

test('injector installs nothing after detach', async () => {
  const { injector, webviews, requests } = setUp();
  injector.attach();
  injector.detach();
  requests[0]?.resolve('INSTALL');
  await settle();
  assert.deepEqual(webviews[0]?.executed, ['UNINSTALL']);
});

test('injector keeps the newest request of a webview', async () => {
  const { injector, webviews, requests } = setUp();
  injector.attach();
  injector.refresh(1);
  requests[1]?.resolve('NEW');
  await settle();
  requests[0]?.resolve('OLD');
  await settle();
  assert.deepEqual(webviews[0]?.executed, ['NEW']);
});

test('injector warns once when a page refuses the script', async () => {
  const { injector, webviews, host, sink, requests } = setUp(3);
  injector.attach();
  requests.forEach((request) => request.resolve('INSTALL'));
  await settle();
  answer(webviews[0] as FakeElement, host, 'Cannot access contents of the page');
  answer(webviews[1] as FakeElement, host, 'Cannot access contents of the page');
  (webviews[2] as FakeElement).throwOnExecute = true;
  injector.refresh(3);
  requests[3]?.resolve('INSTALL');
  await settle();
  assert.equal(lines(sink, 'warn').length, 1);
});

test('injector logs a closed tab at debug level', async () => {
  const { injector, container, webviews, host, sink, requests } = setUp(2);
  injector.attach();
  requests.forEach((request) => request.resolve('INSTALL'));
  await settle();
  answer(webviews[0] as FakeElement, host, TAB_CLOSED_ERROR);
  (webviews[1] as FakeElement).remove();
  answer(webviews[1] as FakeElement, host, 'No tab with id');
  assert.equal(container.children.length, 1);
  assert.equal(lines(sink, 'debug').length, 2);
  assert.equal(lines(sink, 'warn').length, 0);
});
