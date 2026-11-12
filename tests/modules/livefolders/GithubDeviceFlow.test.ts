import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODE_URL, DeviceFlowFailure, GithubDeviceFlow, TOKEN_URL } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import { FakeDeviceGithub, ManualTimers } from './fakes.js';

const CLIENT_ID = 'Iv1.public-client-id';

const setup = (): { github: FakeDeviceGithub; timers: ManualTimers; flow: GithubDeviceFlow } => {
  const github = new FakeDeviceGithub();
  const timers = new ManualTimers();
  return { github, timers, flow: new GithubDeviceFlow({ clientId: CLIENT_ID, send: github.send, timers }) };
};

const failureOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
    return 'no failure';
  } catch (error) {
    return error instanceof DeviceFlowFailure ? error.reason : 'other';
  }
};

test('asks GitHub for a code with the client id and the repo scope', async () => {
  const { github, flow } = setup();
  const code = await flow.start();
  assert.deepEqual(code, { userCode: 'WDJB-MJHT', deviceCode: 'dev-123', verificationUri: 'https://github.com/login/device', interval: 5, expiresIn: 900 });
  assert.deepEqual(github.requests, [{ url: CODE_URL, fields: { client_id: CLIENT_ID, scope: 'repo' } }]);
});

test('polls at the interval github asks for', async () => {
  const { github, timers, flow } = setup();
  github.answers.push({ error: 'authorization_pending' }, { error: 'slow_down' }, { error: 'authorization_pending' }, { access_token: 'gho_secret', token_type: 'bearer' });
  const code = await flow.start();
  const waiting = flow.wait(code);
  assert.deepEqual(timers.delays, [5000]);
  assert.equal(github.checks.length, 0);
  await timers.fire();
  assert.equal(github.checks.length, 1);
  await timers.fire();
  assert.equal(github.checks.length, 2);
  await timers.fire();
  await timers.fire();
  assert.equal(await waiting, 'gho_secret');
  assert.deepEqual(timers.delays, [5000, 5000, 10000, 10000]);
  assert.deepEqual(github.checks[0], { url: TOKEN_URL, fields: { client_id: CLIENT_ID, device_code: 'dev-123', grant_type: 'urn:ietf:params:oauth:grant-type:device_code' } });
  assert.equal(timers.pending.length, 0);
});

test('stops waiting when the code expires, access is denied or the flow is cancelled', async () => {
  const expired = setup();
  expired.github.answers.push({ error: 'expired_token' });
  const first = failureOf(expired.flow.wait(await expired.flow.start()));
  await expired.timers.fire();
  assert.equal(await first, 'expired');

  const denied = setup();
  denied.github.answers.push({ error: 'access_denied' });
  const second = failureOf(denied.flow.wait(await denied.flow.start()));
  await denied.timers.fire();
  assert.equal(await second, 'denied');

  const cancelled = setup();
  const third = failureOf(cancelled.flow.wait(await cancelled.flow.start()));
  cancelled.flow.cancel();
  assert.equal(await third, 'cancelled');
  assert.equal(cancelled.timers.pending.length, 0);
});

test('gives up on its own once the time of the code has passed', async () => {
  const { github, timers, flow } = setup();
  github.code = { ...github.code, expires_in: 10, interval: 5 };
  const waiting = failureOf(flow.wait(await flow.start()));
  await timers.fire();
  await timers.fire();
  assert.equal(await waiting, 'expired');
  assert.equal(github.checks.length, 2);
});

test('keeps waiting when a check cannot reach GitHub and fails when the code cannot be had', async () => {
  const { github, timers, flow } = setup();
  const code = await flow.start();
  github.unreachable = true;
  const waiting = flow.wait(code);
  await timers.fire();
  github.unreachable = false;
  github.answers.push({ access_token: 'gho_later' });
  await timers.fire();
  assert.equal(await waiting, 'gho_later');
  github.unreachable = true;
  assert.equal(await failureOf(flow.start()), 'unreachable');
});

test('does not poll again after a cancel that came while a check was running', async () => {
  const { github, timers, flow } = setup();
  const waiting = failureOf(flow.wait(await flow.start()));
  timers.pending.shift()?.run();
  flow.cancel();
  assert.equal(await waiting, 'cancelled');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(timers.pending.length, 0);
  assert.equal(github.checks.length, 1);
});
