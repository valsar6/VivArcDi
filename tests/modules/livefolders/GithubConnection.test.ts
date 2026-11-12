import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONNECTION_STORAGE_KEY, GithubConnection, USER_URL } from '../../../src/modules/livefolders/GithubConnection.js';
import { GithubPullRequests } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { LiveEntries, CONNECT_TITLE } from '../../../src/modules/livefolders/LiveEntries.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';
import { FakeDeviceGithub, FakeGithub, MemoryStorage, ME, pullRequest, recordingLogger } from './fakes.js';
import { GithubDeviceFlow } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import { ManualTimers } from './fakes.js';

const TOKEN = 'gho_connection_token';

const setup = (): { github: FakeGithub; storage: MemoryStorage; connection: GithubConnection } => {
  const github = new FakeGithub([pullRequest(1)]);
  const storage = new MemoryStorage();
  return { github, storage, connection: new GithubConnection({ storage, logger: recordingLogger().logger, send: github.fetch }) };
};

test('saves the token with the login of its owner', async () => {
  const { connection, storage, github } = setup();
  assert.equal(connection.connected, false);
  assert.equal(await connection.save(TOKEN), ME);
  assert.deepEqual([connection.token, connection.login, connection.connected], [TOKEN, ME, true]);
  assert.equal(github.requests[0]?.url, USER_URL);
  assert.ok(storage.getItem(CONNECTION_STORAGE_KEY)?.includes(TOKEN));
});

test('keeps the token when the login cannot be read', async () => {
  const { connection, github } = setup();
  github.status = 500;
  assert.equal(await connection.save(TOKEN), '');
  assert.deepEqual([connection.token, connection.login], [TOKEN, '']);
  github.unreachable = true;
  assert.equal(await connection.save('gho_other'), '');
  assert.equal(connection.token, 'gho_other');
});

test('forgets the token on disconnect', async () => {
  const { connection, storage } = setup();
  let changes = 0;
  connection.onChange(() => void (changes += 1));
  await connection.save(TOKEN);
  connection.forget();
  assert.deepEqual([connection.token, connection.login, connection.connected], [null, null, false]);
  assert.ok(![...storage.items.values()].some((value) => value.includes(TOKEN)));
  assert.equal(changes, 2);
  const store = new LiveFolderStore(storage, recordingLogger().logger, () => 'f1');
  store.add('5');
  const folder = store.find('f1');
  assert.ok(folder !== undefined);
  const entry = LiveEntries.folder({ ...folder, rows: [{ id: '1', title: 'Old row', url: 'https://github.com/a/b/pull/1', subtitle: 'x', updatedAt: '' }] }, { configured: true, connected: connection.connected });
  assert.deepEqual(entry.children.map((child) => child.title), [CONNECT_TITLE]);
});

test('sees a connection that another window stored, and a stopped listener hears nothing', async () => {
  const { connection, storage } = setup();
  storage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify({ token: TOKEN, login: 'ada' }));
  assert.deepEqual([connection.token, connection.login], [TOKEN, 'ada']);
  storage.setItem(CONNECTION_STORAGE_KEY, '{broken');
  assert.equal(connection.token, null);
  let heard = 0;
  const stop = connection.onChange(() => void (heard += 1));
  stop();
  connection.forget();
  assert.equal(heard, 0);
});

test('sends the token only in GET requests to api.github.com', async () => {
  const { github, connection } = setup();
  const device = new FakeDeviceGithub();
  const timers = new ManualTimers();
  const flow = new GithubDeviceFlow({ clientId: 'id', send: device.send, timers });
  device.answers.push({ access_token: TOKEN });
  const waiting = flow.wait(await flow.start());
  await timers.fire();
  await connection.save(await waiting);
  await new GithubPullRequests(github.fetch).list(PullRequestFilters.defaults(), TOKEN);
  const carrying = github.requests.filter((request) => request.headers['Authorization'] === `Bearer ${TOKEN}`);
  assert.ok(carrying.length >= 3);
  assert.ok(carrying.every((request) => request.method === 'GET' && request.url.startsWith('https://api.github.com/')));
  assert.ok(device.requests.every((request) => request.url.startsWith('https://github.com/login/') && !JSON.stringify(request.fields).includes(TOKEN)));
});
