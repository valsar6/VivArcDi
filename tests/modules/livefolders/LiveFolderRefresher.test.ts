import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GithubPullRequests } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { LiveEntries, CONNECT_TITLE, MANUAL_URL, TOKEN_COMMAND } from '../../../src/modules/livefolders/LiveEntries.js';
import { LiveFolderRefresher } from '../../../src/modules/livefolders/LiveFolderRefresher.js';
import { LiveFolderStore } from '../../../src/modules/livefolders/LiveFolderStore.js';
import type { LiveFolder } from '../../../src/modules/livefolders/LiveFolderStore.js';
import { FakeGithub, ManualTicker, MemoryStorage, pullRequest, recordingLogger } from './fakes.js';

const TOKEN = 'ghp_never_stored_anywhere';
const FIVE_MINUTES = 300_000;

interface Setup {
  github: FakeGithub;
  store: LiveFolderStore;
  storage: MemoryStorage;
  refresher: LiveFolderRefresher;
  ticker: ManualTicker;
  folder: LiveFolder;
  changes: () => number;
  logged: () => string;
}

function setup(token: string | null = TOKEN): Setup {
  const github = new FakeGithub([pullRequest(1, { title: 'First' }), pullRequest(2, { title: 'Second', reviewRequested: true })]);
  const storage = new MemoryStorage();
  const { logger, sink } = recordingLogger();
  let next = 0;
  const store = new LiveFolderStore(storage, logger, () => `f${(next += 1)}`);
  const folder = store.add('5');
  const ticker = new ManualTicker();
  let changed = 0;
  const refresher = new LiveFolderRefresher({
    store,
    github: new GithubPullRequests(github.fetch),
    token: { read: async (): Promise<string | null> => token },
    changed: (): void => void (changed += 1),
    ticker,
    intervalMs: FIVE_MINUTES,
    logger,
    now: (): number => 1234,
  });
  return { github, store, storage, refresher, ticker, folder, changes: (): number => changed, logged: (): string => sink.lines.join('\n') };
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
  assert.equal(LiveEntries.folder(failed).warning, "GitHub's rate limit, retrying later");
  assert.equal(LiveEntries.folder(failed).children.length, 2);
  context.github.status = 200;
  context.github.unreachable = true;
  await refreshed(context);
  assert.equal(context.store.find('f1')?.warning, 'GitHub cannot be reached');
  context.github.unreachable = false;
  await refreshed(context);
  assert.equal(context.store.find('f1')?.warning, null);
});

test('asks for a token when none is stored', async () => {
  const context = setup(null);
  await refreshed(context);
  assert.equal(context.github.requests.length, 0);
  const entry = LiveEntries.folder(context.store.find('f1') as LiveFolder);
  assert.deepEqual(
    entry.children.map((child) => (child.kind === 'link' ? [child.title, child.subtitle, child.url] : null)),
    [[CONNECT_TITLE, TOKEN_COMMAND, MANUAL_URL]],
  );
});

test('shows the rows again once a token is stored', async () => {
  let token: string | null = null;
  const context = setup();
  const replaced = new LiveFolderRefresher({
    store: context.store,
    github: new GithubPullRequests(context.github.fetch),
    token: { read: async (): Promise<string | null> => token },
    changed: (): void => undefined,
    ticker: context.ticker,
    intervalMs: FIVE_MINUTES,
    logger: recordingLogger().logger,
  });
  replaced.refresh('f1');
  await replaced.idle();
  assert.equal(context.store.find('f1')?.needsToken, true);
  token = TOKEN;
  replaced.refresh('f1');
  await replaced.idle();
  assert.equal(context.store.find('f1')?.needsToken, false);
  assert.equal(context.store.find('f1')?.rows.length, 2);
});

test('never stores the token in browser storage', async () => {
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
  assert.ok([...context.storage.items.values()].every((value) => !value.includes(TOKEN)));
  assert.ok(!context.logged().includes(TOKEN));
  assert.ok(!context.logged().includes('Bearer'));
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
