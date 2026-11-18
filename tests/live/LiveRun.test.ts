import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Cleanup } from '../../scripts/live/Cleanup.js';
import { LiveRun } from '../../scripts/live/LiveRun.js';
import type { LiveRunParts } from '../../scripts/live/LiveRun.js';
import { Report } from '../../scripts/live/Report.js';
import type { CheckResult } from '../../scripts/live/Report.js';
import type { Check } from '../../scripts/live/Session.js';
import { consoleEvent, fakeCdp, tempDir } from './fakes.js';
import type { FakeSocket } from './fakes.js';

const PNG = Buffer.from('fake png');
const ACTIVE = '0.59.0 active on Vivaldi 8.3';

interface Harness {
  run: LiveRun;
  dir: string;
  events: string[];
  socket: FakeSocket;
}

function harness(checks: Check[], overrides: Partial<LiveRunParts> = {}): Harness {
  const dir = tempDir();
  const events: string[] = [];
  const { cdp, socket } = fakeCdp((method) => {
    if (method === 'Runtime.enable') {
      queueMicrotask(() => socket.emit('Runtime.consoleAPICalled', consoleEvent('info', '[VivArcDi]', ACTIVE)));
    }
    return method === 'Page.captureScreenshot' ? { data: PNG.toString('base64') } : {};
  });
  const parts: LiveRunParts = {
    prepareLab: async () => ({ executable: '/lab/Vivaldi', vivaldiVersion: '8.3.4191.44', resourcesDir: '/lab/r', labDir: '/lab' }),
    createProfile: async () => ({ path: '/tmp/profile', remove: async () => void events.push('profile removed') }),
    launch: async () => ({ endpoint: 'http://127.0.0.1:1', stop: async () => void events.push('vivaldi stopped') }),
    attach: async () => cdp,
    catalog: async () => ({ version: '8.1', selectors: { browser: '#browser' } }),
    checks: () => checks,
    report: new Report(dir),
    payloadVersion: '0.59.0',
    ...overrides,
  };
  return { run: new LiveRun(parts, new Cleanup()), dir, events, socket };
}

const check = (results: CheckResult[]): Check => ({ run: async () => results });

test('harness cleans up after a failed run', async () => {
  const failing: Check = {
    run: async () => {
      throw new Error('the window vanished');
    },
  };
  const { run, events, socket, dir } = harness([failing]);

  const code = await run.run();

  assert.equal(code, 1);
  assert.deepEqual(events, ['vivaldi stopped', 'profile removed']);
  assert.equal(socket.closed, true);
  assert.match(readFileSync(join(dir, 'report.md'), 'utf8'), /the window vanished/);
});

test('cleans up when Vivaldi cannot be attached', async () => {
  const { run, events } = harness([], {
    attach: async () => {
      throw new Error('No window.html target');
    },
  });

  assert.equal(await run.run(), 1);
  assert.deepEqual(events, ['vivaldi stopped', 'profile removed']);
});

test('harness saves a screenshot and fails on a failed check', async () => {
  const { run, dir, socket } = harness([
    check([{ name: 'selector tabStrip', outcome: 'fail', detail: '.tab-strip in default' }]),
  ]);

  const code = await run.run();

  const shot = join(dir, 'screenshots', 'selector-tabstrip.png');
  assert.equal(code, 1);
  assert.ok(socket.methods().includes('Page.captureScreenshot'));
  assert.deepEqual(readFileSync(shot), PNG);
  const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')) as { results: CheckResult[] };
  assert.equal(report.results[0]?.screenshot, shot);
});

test('passes with no screenshot when every check passes or is not checked', async () => {
  const { run, dir } = harness([
    check([
      { name: 'selector browser', outcome: 'pass', detail: '' },
      { name: 'selector rare', outcome: 'not checked', detail: 'needs a split view' },
    ]),
  ]);

  assert.equal(await run.run(), 0);
  assert.equal(existsSync(join(dir, 'screenshots')), false);
});

test('report lists versions, results and console lines', async () => {
  const { run, dir } = harness([check([{ name: 'selector browser', outcome: 'pass', detail: '#browser in default' }])]);

  await run.run();

  const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')) as Record<string, unknown>;
  assert.equal(report['vivaldiVersion'], '8.3.4191.44');
  assert.equal(report['payloadVersion'], '0.59.0');
  assert.equal(report['catalogVersion'], '8.1');
  assert.deepEqual(report['results'], [{ name: 'selector browser', outcome: 'pass', detail: '#browser in default' }]);
  assert.deepEqual(report['console'], [{ level: 'info', text: `[VivArcDi] ${ACTIVE}` }]);
  const summary = readFileSync(join(dir, 'report.md'), 'utf8');
  assert.match(summary, /Vivaldi 8\.3\.4191\.44, VivArcDi 0\.59\.0, selectors 8\.1/);
  assert.match(summary, /\| selector browser \| pass \|/);
});
