import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Logger } from '../../../src/core/support/Logger.js';
import { Notices } from '../../../src/core/dom/Notices.js';
import { GithubPullRequests } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { LiveEntries, CONNECT_TITLE, NOT_SET_UP_TITLE, RECONNECT_TITLE } from '../../../src/modules/livefolders/LiveEntries.js';
import type { ConnectionState } from '../../../src/modules/livefolders/LiveEntries.js';
import { LiveFolderRefresher, REFUSED_NOTICE } from '../../../src/modules/livefolders/LiveFolderRefresher.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import type { LiveFolder } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { RecordingToast } from '../../loader/fakes.js';
import { FakeConnection, FakeGithub, HeldGithub, ManualTicker, MemoryStorage, pullRequest, recordingLogger } from './fakes.js';

const TOKEN = 'ghp_never_stored_anywhere';
const OTHER_TOKEN = 'ghp_renewed_elsewhere';
const FIVE_MINUTES = 300_000;

const CONNECTED: ConnectionState = { configured: true, connected: true };
const NOT_CONNECTED: ConnectionState = { configured: true, connected: false };

interface Setup {
  connection: FakeConnection;
  toasts: RecordingToast;
  github: FakeGithub;
  store: LiveFolderStore;
  logger: Logger;
  storage: MemoryStorage;
  refresher: LiveFolderRefresher;
  ticker: ManualTicker;
  folder: LiveFolder;
  changes: () => number;
  logged: () => string;
}

function setup(token: string | null = TOKEN, held?: Pick<GithubPullRequests, 'list'>): Setup {
  const github = new FakeGithub([pullRequest(1, { title: 'First' }), pullRequest(2, { title: 'Second', reviewRequested: true })]);
  const storage = new MemoryStorage();
  const { logger, sink } = recordingLogger();
  let next = 0;
  const store = new LiveFolderStore(storage, logger, () => `f${(next += 1)}`);
  const folder = store.add('5');
  const ticker = new ManualTicker();
  const connection = new FakeConnection(token);
  const toasts = new RecordingToast();
  let changed = 0;
  const refresher = new LiveFolderRefresher({
    store,
    github: held ?? new GithubPullRequests(github.fetch),
    connection,
    notices: new Notices(toasts),
    changed: (): void => void (changed += 1),
    ticker,
    intervalMs: FIVE_MINUTES,
    logger,
    now: (): number => 1234,
  });
  return { connection, toasts, github, store, logger, storage, refresher, ticker, folder, changes: (): number => changed, logged: (): string => sink.lines.join('\n') };
}

const refreshed = async ({ refresher, folder }: Setup): Promise<void> => {
  refresher.refresh(folder.id);
  await refresher.idle();
};

test('keeps rows when the refresh fails', async () => {
  const context = setup();
  await refreshed(context);
  const rowsBefore = context.store.find('f1')?.rows ?? [];
  assert.equal(rowsBefore.length, 2);
  context.github.status = 403;
  await refreshed(context);
  const failed = context.store.find('f1');
  assert.deepEqual(failed?.rows, rowsBefore);
  assert.equal(failed?.warning, "GitHub's rate limit, retrying later");
  assert.equal(LiveEntries.folder(failed, CONNECTED).warning, "GitHub's rate limit, retrying later");
  assert.equal(LiveEntries.folder(failed, CONNECTED).children.length, 2);
  context.github.status = 200;
  context.github.unreachable = true;
  await refreshed(context);
  assert.equal(context.store.find('f1')?.warning, 'GitHub cannot be reached');
  context.github.unreachable = false;
  await refreshed(context);
  assert.equal(context.store.find('f1')?.warning, null);
});

test('asks to connect when github is not connected', async () => {
  const context = setup(null);
  await refreshed(context);
  assert.equal(context.github.requests.length, 0);
  const folder = context.store.find('f1') as LiveFolder;
  const titles = (state: ConnectionState): Array<string | undefined> => LiveEntries.folder(folder, state).children.map((child) => (child.kind === 'link' ? child.title : undefined));
  assert.deepEqual(titles(NOT_CONNECTED), [CONNECT_TITLE]);
  assert.deepEqual(titles({ configured: false, connected: false }), [NOT_SET_UP_TITLE]);
});

test('shows the rows again once GitHub is connected', async () => {
  const context = setup(null);
  await refreshed(context);
  assert.equal(context.store.find('f1')?.rows.length, 0);
  context.connection.token = TOKEN;
  await refreshed(context);
  assert.equal(context.store.find('f1')?.rows.length, 2);
});

test('empties the folder when the connection is forgotten', async () => {
  const context = setup();
  await refreshed(context);
  context.connection.token = null;
  context.github.requests.length = 0;
  await refreshed(context);
  assert.deepEqual(context.store.find('f1')?.rows, []);
  assert.equal(context.github.requests.length, 0);
});

test('never logs the token', async () => {
  const context = setup();
  await refreshed(context);
  context.github.status = 401;
  await refreshed(context);
  context.github.status = 200;
  context.github.unreachable = true;
  await refreshed(context);
  assert.ok(context.github.requests.some((request) => request.headers['Authorization'] === `Bearer ${TOKEN}`));
  assert.ok(context.storage.writes.length > 0);
  assert.ok(context.storage.writes.every((written) => !written.includes(TOKEN)));
  assert.ok(!context.logged().includes(TOKEN));
  assert.ok(!context.logged().includes('Bearer'));
});

test('forgets the token when GitHub refuses it', async () => {
  const context = setup();
  await refreshed(context);
  context.github.status = 401;
  await refreshed(context);
  const refused = context.store.find('f1') as LiveFolder;
  assert.equal(context.connection.token, null);
  assert.deepEqual(refused.rows, []);
  assert.equal(refused.needsReconnect, false);
  assert.deepEqual(LiveEntries.folder(refused, NOT_CONNECTED).children.map((child) => child.title), [CONNECT_TITLE]);
});

test('stops calling GitHub after the token is refused', async () => {
  const context = setup();
  context.github.status = 401;
  context.refresher.start();
  await context.refresher.idle();
  const sent = context.github.requests.length;
  assert.equal(sent, 2);
  await refreshed(context);
  context.ticker.tick();
  await context.refresher.idle();
  assert.equal(context.github.requests.length, sent);
  context.connection.token = OTHER_TOKEN;
  await refreshed(context);
  assert.ok(context.github.requests.length > sent);
});

test('keeps the token on a rate limit', async () => {
  const context = setup();
  await refreshed(context);
  const rowsBefore = context.store.find('f1')?.rows ?? [];
  for (const status of [403, 429]) {
    context.github.status = status;
    await refreshed(context);
    assert.equal(context.connection.token, TOKEN);
    assert.equal(context.connection.forgets, 0);
    assert.equal(context.toasts.shown.length, 0);
    assert.deepEqual(context.store.find('f1')?.rows, rowsBefore);
    assert.equal(context.store.find('f1')?.warning, "GitHub's rate limit, retrying later");
  }
});

test('keeps a token renewed in another window', async () => {
  const github = new FakeGithub([pullRequest(1)]);
  const real = new GithubPullRequests(github.fetch);
  const renewing: Pick<GithubPullRequests, 'list'> = {
    list: async (filters, token) => {
      if (token === TOKEN) {
        context.connection.token = OTHER_TOKEN;
      }
      try {
        return await real.list(filters, token);
      } finally {
        github.status = 200;
      }
    },
  };
  const context = setup(TOKEN, renewing);
  github.status = 401;
  context.refresher.start();
  await context.refresher.idle();
  assert.equal(context.connection.token, OTHER_TOKEN);
  assert.equal(context.toasts.shown.length, 0);
  assert.equal(context.connection.forgets, 1);
  assert.deepEqual([...new Set(github.requests.map((request) => request.headers['Authorization']))], [`Bearer ${TOKEN}`, `Bearer ${OTHER_TOKEN}`]);
  assert.equal(context.store.find('f1')?.rows.length, 1);
});

test('tells the user once when GitHub refuses the token', async () => {
  const context = setup();
  context.store.add('9');
  context.github.status = 401;
  context.refresher.refreshAll();
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 2);
  assert.deepEqual(context.toasts.shown, [{ text: REFUSED_NOTICE, kind: 'error' }]);
  assert.ok(!context.toasts.shown.some((shown) => shown.text.includes(TOKEN)));
  assert.ok(!context.logged().includes(TOKEN));
});

test('tells the user again after a new refusal', async () => {
  const context = setup();
  context.github.status = 401;
  await refreshed(context);
  context.connection.token = OTHER_TOKEN;
  await refreshed(context);
  assert.equal(context.connection.token, null);
  assert.deepEqual(context.toasts.shown, [
    { text: REFUSED_NOTICE, kind: 'error' },
    { text: REFUSED_NOTICE, kind: 'error' },
  ]);
});

test('discards the token on a refresh from the menu', async () => {
  const timer = setup();
  timer.refresher.start();
  await timer.refresher.idle();
  timer.github.status = 401;
  timer.ticker.tick();
  await timer.refresher.idle();
  const menu = setup();
  menu.github.status = 401;
  await refreshed(menu);
  for (const context of [timer, menu]) {
    assert.equal(context.connection.token, null);
    assert.equal(context.toasts.shown.length, 1);
  }
});

test('clears the old reconnect flag on success', async () => {
  const context = setup();
  context.store.update('f1', { needsReconnect: true });
  const before = LiveEntries.folder(context.store.find('f1') as LiveFolder, CONNECTED);
  assert.equal(before.children[0]?.title, RECONNECT_TITLE);
  await refreshed(context);
  assert.equal(context.store.find('f1')?.needsReconnect, false);
  assert.equal(context.store.find('f1')?.warning, null);
  assert.equal(context.toasts.shown.length, 0);
  assert.equal(context.connection.forgets, 0);
});

test('keeps an archived pull request hidden until it is updated on GitHub', async () => {
  const context = setup();
  await refreshed(context);
  const archived = context.store.find('f1')?.rows.find((row) => row.title === 'First');
  assert.ok(archived !== undefined);
  context.store.update('f1', { archived: { [archived.id]: archived.updatedAt, gone: '2026-01-01T00:00:00Z' } });
  await refreshed(context);
  assert.deepEqual(context.store.find('f1')?.rows.map((row) => row.title), ['Second']);
  assert.deepEqual(Object.keys(context.store.find('f1')?.archived ?? {}), [archived.id]);
  context.github.pullRequests[0] = pullRequest(1, { title: 'First', updatedAt: '2026-12-01T10:00:00Z' });
  await refreshed(context);
  assert.deepEqual(context.store.find('f1')?.rows.map((row) => row.title), ['First', 'Second']);
  assert.deepEqual(context.store.find('f1')?.archived, {});
});

test('refreshes on a timer and on open', async () => {
  const context = setup();
  context.refresher.start();
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 2);
  assert.deepEqual(context.ticker.intervals, [FIVE_MINUTES]);
  context.ticker.tick();
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 4);
  context.refresher.refresh('f1');
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 6);
  context.refresher.stop();
  assert.equal(context.ticker.runs.length, 0);
});

test('refreshes every folder of every workspace on the timer', async () => {
  const context = setup();
  context.store.add('9');
  context.store.add(null);
  context.refresher.refreshAll();
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 6);
});

test('refreshes one folder at a time and merges a burst of requests', async () => {
  const context = setup();
  context.refresher.refresh('f1');
  context.refresher.refresh('f1');
  context.refresher.refresh('f1');
  await context.refresher.idle();
  assert.ok(context.github.requests.length <= 4);
  assert.ok(context.changes() >= 1);
});

test('ignores a folder that was deleted', async () => {
  const context = setup();
  context.store.remove('f1');
  context.refresher.refresh('f1');
  await context.refresher.idle();
  assert.equal(context.github.requests.length, 0);
  assert.equal(context.changes(), 0);
});

const heldSetup = (): { context: Setup; held: HeldGithub; other: LiveFolderStore } => {
  const github = new FakeGithub([pullRequest(1, { title: 'First' }), pullRequest(2, { title: 'Second' })]);
  const held = new HeldGithub(github);
  const context = setup(TOKEN, held);
  const other = new LiveFolderStore(context.storage, context.logger);
  return { context, held, other };
};

test('a refresh keeps a rename made in another window', async () => {
  const { context, held, other } = heldSetup();
  held.hold();
  context.refresher.refresh('f1');
  other.update('f1', { name: 'Renamed', filters: { createdByMe: false, reviewRequests: true, drafts: false, repositories: ['a/b'] } });
  held.release();
  await context.refresher.idle();
  const saved = context.store.find('f1');
  assert.equal(saved?.name, 'Renamed');
  assert.deepEqual(saved?.filters, { createdByMe: false, reviewRequests: true, drafts: false, repositories: ['a/b'] });
  assert.equal(saved?.rows.length, 2);
});

test('a refresh keeps rows archived in another window', async () => {
  const { context, held, other } = heldSetup();
  await refreshed(context);
  const first = context.store.find('f1')?.rows.find((row) => row.title === 'First');
  assert.ok(first !== undefined);
  held.hold();
  context.refresher.refresh('f1');
  other.update('f1', { archived: { [first.id]: first.updatedAt } });
  held.release();
  await context.refresher.idle();
  const saved = context.store.find('f1');
  assert.deepEqual(saved?.rows.map((row) => row.title), ['Second']);
  assert.deepEqual(Object.keys(saved?.archived ?? {}), [first.id]);
});
