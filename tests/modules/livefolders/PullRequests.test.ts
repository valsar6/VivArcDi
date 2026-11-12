import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GithubFailure, GithubPullRequests } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';
import type { PullRequestFilterValues } from '../../../src/modules/livefolders/PullRequestFilters.js';
import { LiveEntries } from '../../../src/modules/livefolders/LiveEntries.js';
import { FakeGithub, pullRequest } from './fakes.js';

const TOKEN = 'ghp_secret';

const dataset = (): FakeGithub =>
  new FakeGithub([
    pullRequest(1, { title: 'Mine only' }),
    pullRequest(2, { title: 'Review only', author: 'ada', repository: 'acme/web', reviewRequested: true }),
    pullRequest(3, { title: 'Mine and review', reviewRequested: true }),
    pullRequest(4, { title: 'My draft', draft: true }),
    pullRequest(5, { title: 'Mine elsewhere', repository: 'acme/web' }),
    pullRequest(6, { title: 'Closed', open: false }),
  ]);

const titles = async (github: FakeGithub, changes: Partial<PullRequestFilterValues> = {}): Promise<string[]> => {
  const rows = await new GithubPullRequests(github.fetch).list({ ...PullRequestFilters.defaults(), ...changes }, TOKEN);
  return rows.map((row) => row.title);
};

test('lists my and review-requested pull requests once', async () => {
  const github = dataset();
  const listed = await titles(github);
  assert.deepEqual(listed.slice().sort(), ['Mine and review', 'Mine elsewhere', 'Mine only', 'My draft', 'Review only']);
  assert.equal(new Set(listed).size, listed.length);
  assert.equal(github.requests.length, 2);
  assert.ok(github.requests.every((request) => request.url.startsWith('https://api.github.com/search/issues?')));
});

test('lists the newest update first', async () => {
  const listed = await titles(dataset());
  assert.equal(listed[0], 'Mine elsewhere');
  assert.equal(listed.at(-1), 'Mine only');
});

test('omits my pull requests when created by me is off', async () => {
  const github = dataset();
  const listed = await titles(github, { createdByMe: false });
  assert.deepEqual(listed.slice().sort(), ['Mine and review', 'Review only']);
  assert.ok(github.queries.every((query) => !query.includes('author:@me')));
});

test('omits review requests when the filter is off', async () => {
  const github = dataset();
  const listed = await titles(github, { reviewRequests: false });
  assert.deepEqual(listed.slice().sort(), ['Mine and review', 'Mine elsewhere', 'Mine only', 'My draft']);
  assert.ok(github.queries.every((query) => !query.includes('review-requested')));
});

test('hides drafts when the filter is off', async () => {
  const listed = await titles(dataset(), { drafts: false });
  assert.ok(!listed.includes('My draft'));
  assert.ok(listed.includes('Mine only'));
});

test('limits pull requests to the chosen repositories', async () => {
  assert.deepEqual((await titles(dataset(), { repositories: ['acme/web'] })).slice().sort(), ['Mine elsewhere', 'Review only']);
  assert.deepEqual(
    (await titles(dataset(), { repositories: ['acme/web', 'valsar6/VivArcDi'] })).slice().sort(),
    ['Mine and review', 'Mine elsewhere', 'Mine only', 'My draft', 'Review only'],
  );
});

test('drops closed pull requests', async () => {
  const github = dataset();
  const before = await titles(github);
  assert.ok(before.includes('Mine only'));
  assert.ok(!before.includes('Closed'));
  github.pullRequests = github.pullRequests.map((candidate) => (candidate.id === 1 ? { ...candidate, open: false } : candidate));
  assert.ok(!(await titles(github)).includes('Mine only'));
});

test('maps a pull request to a row', async () => {
  const [row] = await new GithubPullRequests(new FakeGithub([pullRequest(7, { title: 'Fix the tab bar', author: 'ada', repository: 'acme/web', reviewRequested: true })]).fetch).list(
    PullRequestFilters.defaults(),
    TOKEN,
  );
  assert.deepEqual(row, {
    id: '7',
    title: 'Fix the tab bar',
    url: 'https://github.com/acme/web/pull/7',
    subtitle: 'ada · acme/web',
    updatedAt: '2026-11-07T10:00:00Z',
  });
  const entry = LiveEntries.folder({ id: 'f1', name: 'Pull Requests', filters: PullRequestFilters.defaults(), rows: row === undefined ? [] : [row], warning: null, needsToken: false, refreshedAt: null });
  assert.deepEqual(entry.children, [
    { kind: 'link', id: 'live:f1:7', title: 'Fix the tab bar', url: 'https://github.com/acme/web/pull/7', key: 'github.com/acme/web/pull/7', depth: 1, subtitle: 'ada · acme/web' },
  ]);
});

test('sends nothing when both lists are off', async () => {
  const github = dataset();
  assert.deepEqual(await titles(github, { createdByMe: false, reviewRequests: false }), []);
  assert.equal(github.requests.length, 0);
});

test('sends the token only in the authorization header', async () => {
  const github = dataset();
  await titles(github);
  assert.ok(github.requests.every((request) => request.headers['Authorization'] === `Bearer ${TOKEN}` && !request.url.includes(TOKEN)));
});

test('names why a request failed, without the token', async () => {
  const reasons = new Map<number, string>([
    [401, 'The token was refused'],
    [403, "GitHub's rate limit, retrying later"],
    [422, 'GitHub answered 422'],
  ]);
  for (const [status, reason] of reasons) {
    const github = dataset();
    github.status = status;
    await assert.rejects(titles(github), (error: unknown) => error instanceof GithubFailure && error.message === reason && !error.message.includes(TOKEN));
  }
  const down = dataset();
  down.unreachable = true;
  await assert.rejects(titles(down), (error: unknown) => error instanceof GithubFailure && error.message === 'GitHub cannot be reached');
});
