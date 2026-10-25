import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../src/core/Logger.js';
import { Module } from '../../src/core/Module.js';
import { ModuleRegistry } from '../../src/core/ModuleRegistry.js';
import type { ModuleOptions } from '../../src/core/types.js';
import { VivArcDi } from '../../src/core/VivArcDi.js';
import { ActivationMarker } from '../../src/modules/ActivationMarker.js';
import { FakeDocument, FakeElement, FakeLoader, SilentSink } from './fakes.js';

class Broken extends Module {
  public static override id = 'broken';

  public override start(): void {
    throw new Error('boom');
  }
}

interface AppOptions {
  vivaldiVersion?: string;
  modules?: Record<string, ModuleOptions>;
}

function createApp({ vivaldiVersion = '8.1.3740.12', modules }: AppOptions = {}): {
  app: VivArcDi;
  browser: FakeElement;
  document: FakeDocument;
  sink: SilentSink;
} {
  const browser = new FakeElement();
  const document = new FakeDocument({ '#browser': browser });
  const sink = new SilentSink();
  const loader = new FakeLoader({
    'config.json': {
      styles: ['styles/base.css'],
      modules: modules ?? { 'activation-marker': { enabled: true } },
    },
    'build.json': { vivarcdiVersion: '0.1.0', vivaldiVersion },
    'selectors/index.json': { versions: ['8.1'] },
    'selectors/8.1.json': { browser: '#browser' },
  });
  const registry = new ModuleRegistry().register(ActivationMarker).register(Broken);
  const app = new VivArcDi({
    loader,
    registry,
    logger: new Logger('test', sink),
    document: document as unknown as Document,
  });
  return { app, browser, document, sink };
}

test('start injects styles and starts enabled modules', async () => {
  const { app, browser, document } = createApp();
  await app.start();
  assert.deepEqual(app.startedModules, ['activation-marker']);
  assert.equal(browser.dataset['vivarcdiActive'], '');
  assert.equal(browser.dataset['vivarcdiVersion'], '0.1.0');
  assert.equal(document.head.children.length, 1);
  assert.equal(document.head.children[0]?.dataset['vivarcdi'], 'styles/base.css');
});

test('the activation mark survives a rewrite of the browser classes', async () => {
  const { app, browser } = createApp();
  await app.start();
  browser.classes.clear();
  assert.equal(browser.dataset['vivarcdiActive'], '');
});

test('start stays inactive on a Vivaldi older than every catalog', async () => {
  const { app, document, sink } = createApp({ vivaldiVersion: '7.0.1.1' });
  await app.start();
  assert.deepEqual(app.startedModules, []);
  assert.equal(document.head.children.length, 0);
  assert.match((sink.lines[0] ?? []).join(' '), /staying inactive/);
});

test('a failing module does not stop the others', async () => {
  const { app, sink } = createApp({
    modules: { broken: { enabled: true }, 'activation-marker': { enabled: true } },
  });
  await app.start();
  assert.deepEqual(app.startedModules, ['activation-marker']);
  assert.ok(sink.lines.some(([level, tag]) => level === 'error' && tag === '[test:broken]'));
});

test('stop undoes modules and styles', async () => {
  const { app, browser, document } = createApp();
  await app.start();
  await app.stop();
  assert.equal('vivarcdiActive' in browser.dataset, false);
  assert.equal('vivarcdiVersion' in browser.dataset, false);
  assert.equal(document.head.children.length, 0);
  assert.deepEqual(app.startedModules, []);
});
