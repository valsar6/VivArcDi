import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, events, linesOf, summaryOf } from './boot.js';

const MARKER = { 'activation-marker': { enabled: true } };
const MISSING = 'Vivaldi UI shape: a React fiber on the browser element or its children';

const shapeLines = (lines: unknown[][]): string[] => lines.map((line) => line.slice(2).join(' ')).filter((text) => text.startsWith('Vivaldi UI shape'));

test('boot runs the registered probes once after the modules', async () => {
  events.length = 0;
  const { app } = createApp({ modules: { 'probe-recorder': { enabled: true }, ...MARKER } });
  await app.start();
  assert.deepEqual(events, ['start', 'probe']);
  await app.stop();
});

test("boot warns when Vivaldi's React shape is missing", async () => {
  const { app, sink } = createApp({ modules: { 'react-user': { enabled: true }, ...MARKER } });
  await app.start();
  const warnings = linesOf(sink, '[test:boot]').filter(([level]) => level === 'warn');
  assert.deepEqual(shapeLines(warnings), [MISSING]);
  const summary = summaryOf(sink);
  assert.equal(summary?.level, 'warn');
  assert.match(summary?.text ?? '', /shape warnings: 1$/);
  await app.stop();
});

test("boot stays silent when Vivaldi's React shape is present", async () => {
  const { app, browser, sink } = createApp({ modules: { 'react-user': { enabled: true }, ...MARKER } });
  Object.assign(browser, { __reactFiber$test: {} });
  await app.start();
  assert.deepEqual(shapeLines(sink.lines), []);
  const summary = summaryOf(sink);
  assert.equal(summary?.level, 'info');
  assert.match(summary?.text ?? '', /2 of 2 modules started/);
  assert.doesNotMatch(summary?.text ?? '', /shape warnings/);
  await app.stop();
});
