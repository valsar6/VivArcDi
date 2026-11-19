import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOAST_ATTRIBUTE } from '../../src/core/dom/Toast.js';
import { createApp, runtimeAnswering, savingStorage, seen } from './boot.js';
import type { FakeElement, SilentSink } from './fakes.js';
import type { ModuleOptions } from '../../src/core/boot/types.js';

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

const warningsOf = (sink: SilentSink, tag: string): string[] =>
  sink.lines.filter(([level, line]) => level === 'warn' && line === tag).map((line) => line.slice(2).join(' '));

test('module without a required option stays off with a warning', async () => {
  const { app, sink } = createApp({ modules: { configured: { enabled: true, size: 4 } } });
  await app.start();
  assert.deepEqual(app.startedModules, []);
  assert.deepEqual(warningsOf(sink, '[test:configured]'), [
    'option "clientId" is required and missing: the module stays off',
    'stays off: invalid options',
  ]);
});

test('module starts only when enabled is true', async () => {
  for (const enabled of ['yes', 1, 'true']) {
    const { app, sink } = createApp({ modules: { configured: { enabled, clientId: 'abc' } } as unknown as Record<string, ModuleOptions> });
    await app.start();
    assert.deepEqual(app.startedModules, [], String(enabled));
    assert.deepEqual(warningsOf(sink, '[test:configured]'), [`"enabled" is ${JSON.stringify(enabled)}, not true or false: the module stays off`]);
  }
  const { app, sink } = createApp({ modules: { configured: { enabled: false, clientId: 'abc' } } });
  await app.start();
  assert.deepEqual(app.startedModules, []);
  assert.deepEqual(warningsOf(sink, '[test:configured]'), []);
});

test("other modules' options are checked too", async () => {
  seen.length = 0;
  const { app, sink } = createApp({
    modules: { configured: { enabled: true, clientId: ' abc ', size: 50 }, follower: { enabled: true } },
  });
  await app.start();
  assert.deepEqual(app.startedModules, ['configured', 'follower']);
  assert.deepEqual(seen[0]?.options, { clientId: 'abc', size: 3 });
  assert.deepEqual(seen[1]?.modules['configured'], { clientId: 'abc', size: 3, enabled: true });
  assert.deepEqual(warningsOf(sink, '[test:configured]'), ['option "size" is 50, not a number from 1 to 9: using 3']);
  await app.stop();
});

const toastsOf = (browser: FakeElement): FakeElement[] => browser.children.filter((child) => TOAST_ATTRIBUTE in child.attributes);

test('warns once when nothing can be saved', async () => {
  seen.length = 0;
  const { app, browser } = createApp({
    modules: { configured: { enabled: true, clientId: 'abc' }, follower: { enabled: true } },
    storage: savingStorage('memory'),
  });
  await app.start();
  seen.forEach(({ storage }) => storage.setItem('key', 'value'));
  await new Promise((resolve) => setImmediate(resolve));
  const toasts = toastsOf(browser);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.textContent, 'VivArcDi cannot save its data: changes last until Vivaldi restarts');
  assert.equal(toasts[0]?.attributes['data-vivarcdi-toast-kind'], 'error');
  await app.stop();
  assert.equal(toastsOf(browser).length, 0);
});

test('shows no notice when saving works', async () => {
  seen.length = 0;
  const { app, browser } = createApp({ modules: { follower: { enabled: true } } });
  await app.start();
  seen.forEach(({ storage }) => storage.setItem('key', 'value'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(seen.length, 1);
  assert.equal(toastsOf(browser).length, 0);
  await app.stop();
});
