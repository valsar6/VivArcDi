import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { TOAST_ATTRIBUTE } from '../../src/core/dom/Toast.js';
import { createApp, linesOf, summaryOf } from './boot.js';
import type { AppOptions } from './boot.js';
import type { FakeElement, SilentSink } from './fakes.js';

const MARKER = { 'activation-marker': { enabled: true } };
const ACTIVE_LINE = '0.1.0 active on Vivaldi 8.1.3740.12 (selectors 8.1, modules: activation-marker)';
const CLEAN_SUMMARY =
  'self-check: active, 1 of 1 modules started, 0 failed (VivArcDi 0.1.0, Vivaldi 8.1.3740.12, selectors 8.1); off: 0 in config, 0 for this window, 0 by options; undefined selectors: 0';

const toastsOf = (browser: FakeElement): FakeElement[] => browser.children.filter((child) => TOAST_ATTRIBUTE in child.attributes);

const textsOf = (sink: SilentSink, tag: string, level: string): string[] =>
  linesOf(sink, tag)
    .filter(([lineLevel]) => lineLevel === level)
    .map((line) => line.slice(2).join(' '));

test('summarizes a clean start in one line', async () => {
  const { app, sink } = createApp();
  await app.start();
  assert.deepEqual(summaryOf(sink), { level: 'info', text: CLEAN_SUMMARY });
  assert.equal(sink.lines.filter((line) => String(line[2]).startsWith('self-check:')).length, 1);
  assert.deepEqual(
    sink.lines.slice(-2).map(([level, tag]) => [level, tag]),
    [
      ['info', '[test]'],
      ['info', '[test:boot]'],
    ],
  );
  await app.stop();
});

test('keeps the active line as it is', async () => {
  const { app, sink } = createApp({ modules: { broken: { enabled: true }, ...MARKER } });
  await app.start();
  assert.deepEqual(textsOf(sink, '[test]', 'info'), [ACTIVE_LINE]);
  const active = sink.lines.findIndex(([, tag]) => tag === '[test]');
  const summary = sink.lines.findIndex((line) => String(line[2]).startsWith('self-check:'));
  assert.ok(active >= 0 && active < summary);
  await app.stop();
});

test('names failed modules in the summary', async () => {
  const { app, sink } = createApp({ modules: { broken: { enabled: true }, ...MARKER } });
  await app.start();
  const summary = summaryOf(sink);
  assert.equal(summary?.level, 'warn');
  assert.match(summary?.text ?? '', /1 failed: broken/);
  assert.equal(textsOf(sink, '[test:broken]', 'error').length, 1);
  await app.stop();
});

test('counts the modules that stay off', async () => {
  const { app, sink } = createApp({
    modules: { hidden: { enabled: false }, private: { enabled: true }, configured: { enabled: true }, ...MARKER },
  });
  await app.start();
  assert.match(summaryOf(sink)?.text ?? '', /1 of 1 modules started.*off: 1 in config, 1 for this window, 1 by options/);
  await app.stop();
});

test('says when invalid options keep a module off', async () => {
  const { app, sink } = createApp({ modules: { configured: { enabled: true } } });
  await app.start();
  const warnings = textsOf(sink, '[test:configured]', 'warn');
  assert.equal(warnings.length, 2);
  assert.equal(warnings[1], 'stays off: invalid options');
  assert.deepEqual(app.startedModules, []);
});

test('lists selectors the catalog does not define', async () => {
  const { app, sink } = createApp({ modules: { asker: { enabled: true }, ...MARKER } });
  await app.start();
  assert.deepEqual(textsOf(sink, '[test:boot]', 'warn').slice(0, 1), ['selector "missing" is not defined in catalog 8.1']);
  const summary = summaryOf(sink);
  assert.equal(summary?.level, 'warn');
  assert.match(summary?.text ?? '', /undefined selectors: 1$/);
  await app.stop();
});

const standInOf = async (options: AppOptions): Promise<{ lines: string[]; level: string | undefined }> => {
  const { app, sink } = createApp(options);
  await app.start();
  await app.stop();
  return {
    lines: textsOf(sink, '[test:boot]', 'info').filter((text) => text.includes('selector catalog of its own')),
    level: summaryOf(sink)?.level,
  };
};

test('says which catalog stands in for a newer Vivaldi', async () => {
  assert.deepEqual(await standInOf({ vivaldiVersion: '8.3.4191.44' }), {
    lines: ['Vivaldi 8.3 has no selector catalog of its own: using 8.1'],
    level: 'info',
  });
  assert.deepEqual((await standInOf({ vivaldiVersion: 'unknown' })).lines, ['Vivaldi unknown has no selector catalog of its own: using 8.1']);
  assert.deepEqual((await standInOf({})).lines, []);
});

test('summarizes an inactive start without a toast', async () => {
  const { app, browser, document, sink } = createApp({ vivaldiVersion: '7.0.1.1' });
  await app.start();
  assert.equal(textsOf(sink, '[test]', 'warn').filter((text) => text.includes('staying inactive')).length, 1);
  const summary = summaryOf(sink);
  assert.equal(summary?.level, 'warn');
  assert.match(summary?.text ?? '', /^self-check: inactive.*selectors none/);
  assert.equal(document.head.children.length, 0);
  assert.equal(toastsOf(browser).length, 0);
});

test('names the stage where startup failed', async () => {
  const cases: Array<[AppOptions, string]> = [
    [{ missing: ['config.json'] }, 'config'],
    [{ missing: ['build.json'] }, 'config'],
    [{ missing: ['selectors/8.1.json'] }, 'selectors'],
    [{ browser: false }, 'interface'],
  ];
  const original = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    public observe(): void {}
    public disconnect(): void {}
  } as unknown as typeof MutationObserver;
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const [options, stage] of cases) {
      const { app, browser, sink } = createApp(options);
      const started = app.start();
      await new Promise((resolve) => setImmediate(resolve));
      mock.timers.tick(15000);
      await started;
      assert.equal(textsOf(sink, '[test]', 'error').filter((text) => text.startsWith('Startup failed')).length, 1, stage);
      const summary = summaryOf(sink);
      assert.equal(summary?.level, 'error', stage);
      assert.match(summary?.text ?? '', new RegExp(`^self-check: failed at ${stage},`), stage);
      assert.equal(toastsOf(browser).length, 0, stage);
    }
  } finally {
    mock.timers.reset();
    globalThis.MutationObserver = original;
  }
});
