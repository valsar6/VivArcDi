import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectFlow } from '../../../src/modules/livefolders/ConnectFlow.js';
import type { ConnectState } from '../../../src/modules/livefolders/ConnectFlow.js';
import { CONNECTION_STORAGE_KEY, GithubConnection } from '../../../src/modules/livefolders/GithubConnection.js';
import { GithubDeviceFlow } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import { GithubPullRequests } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { LiveFolderRefresher } from '../../../src/modules/livefolders/LiveFolderRefresher.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { FakeDeviceGithub, FakeGithub, ManualTicker, ManualTimers, MemoryStorage, ME, pullRequest, recordingLogger } from './fakes.js';
import { settle } from '../reopen/fakes.js';

const TOKEN = 'gho_authorized';

function setup(): { device: FakeDeviceGithub; timers: ManualTimers; storage: MemoryStorage; github: FakeGithub; connection: GithubConnection; connect: ConnectFlow; states: ConnectState[]; run: () => Promise<void> } {
  const device = new FakeDeviceGithub();
  const timers = new ManualTimers();
  const storage = new MemoryStorage();
  const github = new FakeGithub([pullRequest(1, { title: 'Mine' })]);
  const connection = new GithubConnection({ storage, logger: recordingLogger().logger, send: github.fetch });
  const connect = new ConnectFlow({ flow: new GithubDeviceFlow({ clientId: 'id', send: device.send, timers }), connection });
  const states: ConnectState[] = [];
  return { device, timers, storage, github, connection, connect, states, run: (): Promise<void> => connect.run((state) => void states.push(state)) };
}

test('stores the token and refreshes after authorization', async () => {
  const { device, timers, storage, github, connection, states, run } = setup();
  const { logger } = recordingLogger();
  const store = new LiveFolderStore(storage, logger, () => 'f1');
  store.add('5');
  const refresher = new LiveFolderRefresher({ store, github: new GithubPullRequests(github.fetch), connection, changed: (): void => undefined, ticker: new ManualTicker(), intervalMs: 1, logger });
  connection.onChange(() => refresher.refreshAll());
  await refresher.idle();
  assert.deepEqual(store.find('f1')?.rows, []);
  device.answers.push({ access_token: TOKEN });
  const running = run();
  await settle();
  await timers.fire();
  await running;
  assert.deepEqual(states.map((state) => state.step), ['asking', 'code', 'connected']);
  assert.deepEqual(states[1], { step: 'code', userCode: 'WDJB-MJHT', verificationUri: 'https://github.com/login/device' });
  assert.deepEqual(states[2], { step: 'connected', login: ME });
  assert.ok(storage.getItem(CONNECTION_STORAGE_KEY)?.includes(TOKEN));
  await refresher.idle();
  assert.deepEqual(store.find('f1')?.rows.map((row) => row.title), ['Mine']);
});

test('stores nothing when the code expires or is denied', async () => {
  for (const [answer, message] of [
    [{ error: 'expired_token' }, 'The code expired.'],
    [{ error: 'access_denied' }, 'Access was denied on GitHub.'],
  ] as const) {
    const { device, timers, storage, connection, states, run } = setup();
    device.answers.push({ ...answer });
    const running = run();
    await settle();
    await timers.fire();
    await running;
    assert.deepEqual(states.at(-1), { step: 'failed', message });
    assert.equal(storage.writes.length, 0);
    assert.equal(connection.connected, false);
  }
});

test('says GitHub cannot be reached and lets the user try again', async () => {
  const { device, states, run } = setup();
  device.unreachable = true;
  await run();
  assert.deepEqual(states, [{ step: 'asking' }, { step: 'failed', message: 'GitHub cannot be reached.' }]);
  device.unreachable = false;
  states.length = 0;
  const again = run();
  await settle();
  assert.deepEqual(states.map((state) => state.step), ['asking', 'code']);
  void again;
});

test('reports nothing more once it is cancelled, whatever step it was at', async () => {
  const { connect, states, run, timers } = setup();
  const waiting = run();
  await settle();
  connect.cancel();
  await waiting;
  assert.deepEqual(states.map((state) => state.step), ['asking', 'code']);
  assert.equal(timers.pending.length, 0);
  const second = setup();
  const asking = second.run();
  second.connect.cancel();
  await asking;
  await settle();
  assert.deepEqual(second.states.map((state) => state.step), ['asking']);
  assert.equal(second.device.checks.length, 0);
});
