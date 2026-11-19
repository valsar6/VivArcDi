import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRuntime } from '../../../src/core/browser/BrowserRuntime.js';
import { Logger } from '../../../src/core/support/Logger.js';
import { PageScripts } from '../../../src/modules/peek/PageScripts.js';
import { PeekPanel } from '../../../src/modules/peek/PeekPanel.js';
import { PEEK_OPTIONS } from '../../../src/modules/peek/PeekOptions.js';
import { ScriptRunner } from '../../../src/core/browser/ScriptRunner.js';
import { FakeLoader, SilentSink } from '../../loader/fakes.js';
import { FakeDocument, FakeElement, answer } from './fakes.js';

async function setUp(): Promise<{ panel: PeekPanel; container: FakeElement; webview: FakeElement; sink: SilentSink; host: { runtime: { lastError?: { message: string } } } }> {
  const container = new FakeElement('div');
  const document = new FakeDocument({});
  const host: { runtime: { lastError?: { message: string } } } = { runtime: {} };
  const sink = new SilentSink();
  const runner = new ScriptRunner('Peek keys', new BrowserRuntime(host), new Logger('test', sink));
  const scripts = await PageScripts.load(new FakeLoader({ 'page/peek-links.js': 'LINKS', 'page/peek-keys.js': 'KEYS' }));
  const panel = new PeekPanel('https://a.example/', {
    document: document as unknown as Document,
    container: container as unknown as HTMLElement,
    size: PEEK_OPTIONS.defaults,
    partition: null,
    scripts,
    runner,
    token: 'token',
    onCommand: (): void => undefined,
    onConsoleMessage: (): void => undefined,
  });
  const webview = container.descendants().find((element) => element.tagName === 'webview') as FakeElement;
  return { panel, container, webview, sink, host };
}

test('peek panel uninstalls its key script before closing', async () => {
  const { panel, container, webview } = await setUp();
  webview.dispatch('loadcommit', { isTopLevel: true, url: 'https://a.example/' });
  assert.equal(webview.executed.at(-1), 'KEYS\nVivArcDiPeekKeys.install("token");');
  panel.remove();
  assert.equal(webview.executed.at(-1), 'globalThis.VivArcDiPeekKeys?.uninstall();');
  assert.equal(webview.connectedAtRun.at(-1), true);
  assert.equal(container.children.length, 0);
});

test('peek panel warns once when its key script fails', async () => {
  const { panel, webview, sink, host } = await setUp();
  webview.dispatch('loadcommit', { isTopLevel: true, url: 'https://a.example/' });
  webview.dispatch('loadcommit', { isTopLevel: true, url: 'https://b.example/' });
  answer(webview, host, 'Cannot access contents of the page');
  answer(webview, host, 'Cannot access contents of the page');
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
  webview.throwOnExecute = true;
  panel.remove();
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
  assert.equal(panel.url, 'https://b.example/');
});
