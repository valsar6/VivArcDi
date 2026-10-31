import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../../src/core/Logger.js';
import type { BrowserRuntime } from '../../src/core/BrowserRuntime.js';
import { Module } from '../../src/core/Module.js';
import type { PrivateWindowPolicy } from '../../src/core/Module.js';
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

class Hidden extends Module {
  public static override id = 'hidden';

  public override start(): void {}
}

class Private extends Module {
  public static override id = 'private';
  public static override privateWindows: PrivateWindowPolicy = 'only';

  public override start(): void {}
}

const runtimeAnswering = (answer: () => Promise<boolean>): BrowserRuntime => ({ isPrivateWindow: answer }) as unknown as BrowserRuntime;

interface AppOptions {
  runtime?: BrowserRuntime;
  vivaldiVersion?: string;
  modules?: Record<string, ModuleOptions>;
}

function createApp({ vivaldiVersion = '8.1.3740.12', modules, runtime }: AppOptions = {}): {
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
  const registry = new ModuleRegistry().register(ActivationMarker).register(Broken).register(Hidden).register(Private);
  const app = new VivArcDi({
    loader,
    registry,
    logger: new Logger('test', sink),
    document: document as unknown as Document,
    ...(runtime === undefined ? {} : { runtime }),
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

const ALL_KINDS = { hidden: { enabled: true }, private: { enabled: true }, 'activation-marker': { enabled: true } };

test('start asks for the window kind and starts only the modules that fit a private window', async () => {
  const { app } = createApp({ modules: ALL_KINDS, runtime: runtimeAnswering(async () => true) });
  await app.start();
  assert.deepEqual(app.startedModules, ['private', 'activation-marker']);
});

test('start keeps private-only modules out of a normal window', async () => {
  const { app } = createApp({ modules: ALL_KINDS, runtime: runtimeAnswering(async () => false) });
  await app.start();
  assert.deepEqual(app.startedModules, ['hidden', 'activation-marker']);
});

test('treats an unreadable window as normal', async () => {
  const { app, sink } = createApp({
    modules: ALL_KINDS,
    runtime: runtimeAnswering(() => Promise.reject(new Error('no window'))),
  });
  await app.start();
  assert.deepEqual(app.startedModules, ['hidden', 'activation-marker']);
  assert.equal(sink.lines.filter(([level]) => level === 'warn').length, 1);
});
