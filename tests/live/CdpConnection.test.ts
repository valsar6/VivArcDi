import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WindowTarget } from '../../scripts/live/cdp/WindowTarget.js';
import { BootCheck, BOOT_CHECK_NAME } from '../../scripts/live/checks/BootCheck.js';
import { Cleanup } from '../../scripts/live/Cleanup.js';
import { ConsoleLog } from '../../scripts/live/ConsoleLog.js';
import { Driver } from '../../scripts/live/Driver.js';
import type { Session } from '../../scripts/live/Session.js';
import { consoleEvent, fakeCdp } from './fakes.js';

const WINDOW = 'chrome-extension://mpognobbkildjkofajifpdfhcoklimli/window.html';

test('commands get their own reply and errors reject', async () => {
  const { cdp, socket } = fakeCdp((method) => (method === 'Bad.call' ? { error: 'not found' } : { echoed: method }));

  assert.deepEqual(await cdp.send('Runtime.enable'), { echoed: 'Runtime.enable' });
  await assert.rejects(cdp.send('Bad.call'), /not found/);
  assert.deepEqual(socket.sent.map(({ id }) => id), [1, 2]);
});

test('events reach their listeners and close fails waiting commands', async () => {
  const { cdp, socket } = fakeCdp();
  const seen: unknown[] = [];
  cdp.on('Page.loadEventFired', (params) => seen.push(params));

  socket.emit('Page.loadEventFired', { timestamp: 1 });
  cdp.close();

  assert.deepEqual(seen, [{ timestamp: 1 }]);
  assert.equal(socket.closed, true);
});

test('picks window.html among the targets', () => {
  const targets = [
    { type: 'page', url: 'https://example.com/', webSocketDebuggerUrl: 'ws://page' },
    { type: 'page', url: WINDOW, webSocketDebuggerUrl: 'ws://window' },
  ];

  assert.equal(WindowTarget.pick(targets), 'ws://window');
  assert.equal(WindowTarget.pick(targets.slice(0, 1)), null);
});

test('waits until window.html is listed', async () => {
  const answers = [[], [{ type: 'page', url: WINDOW, webSocketDebuggerUrl: 'ws://window' }]];

  assert.equal(await WindowTarget.find('http://127.0.0.1:1', async () => answers.shift() ?? []), 'ws://window');
});

test('keeps only the VivArcDi console lines', () => {
  const { cdp, socket } = fakeCdp();
  const log = new ConsoleLog(cdp);

  socket.emit('Runtime.consoleAPICalled', consoleEvent('log', 'page noise'));
  socket.emit('Runtime.consoleAPICalled', consoleEvent('error', '[VivArcDi:peek]', 'failed'));

  assert.deepEqual(log.lines, [{ level: 'error', text: '[VivArcDi:peek] failed' }]);
  assert.deepEqual(log.errors, log.lines);
});

function bootSession(...lines: Array<[string, string]>): Session {
  const { cdp, socket } = fakeCdp();
  const console = new ConsoleLog(cdp);
  lines.forEach(([type, text]) => socket.emit('Runtime.consoleAPICalled', consoleEvent(type, '[VivArcDi]', text)));
  return { driver: new Driver(cdp, {}), console };
}

test('boot check passes when every enabled module started', async () => {
  const session = bootSession(['info', '0.59.0 active on Vivaldi 8.3.4191.44 (selectors 8.1, modules: peek, today)']);

  const [result] = await new BootCheck(['peek', 'today']).run(session);

  assert.deepEqual(result, { name: BOOT_CHECK_NAME, outcome: 'pass', detail: '2 modules started' });
});

test('boot check fails on a missing module, an error or no active line', async () => {
  const session = bootSession(
    ['error', 'Module "today" failed to start'],
    ['info', '0.59.0 active on Vivaldi 8.3 (selectors 8.1, modules: peek)'],
  );

  const [failed] = await new BootCheck(['peek', 'today']).run(session);
  const [silent] = await new BootCheck(['peek'], 0).run(bootSession());

  assert.equal(failed?.outcome, 'fail');
  assert.match(failed?.detail ?? '', /module today did not start; \[VivArcDi\] Module "today" failed to start/);
  assert.equal(silent?.outcome, 'fail');
});

test('cleanup runs every step once, last added first, despite failures', async () => {
  const cleanup = new Cleanup();
  const order: string[] = [];
  cleanup.add(() => void order.push('profile'));
  cleanup.add(() => {
    throw new Error('already gone');
  });
  cleanup.add(() => void order.push('vivaldi'));

  const errors = await cleanup.run();
  await cleanup.run();

  assert.deepEqual(order, ['vivaldi', 'profile']);
  assert.equal(errors.length, 1);
});
