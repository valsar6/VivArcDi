import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PullRequestFilters } from '../../../src/modules/livefolders/PullRequestFilters.js';

test('every filter is on by default and no repository is chosen', () => {
  assert.deepEqual(PullRequestFilters.defaults(), { createdByMe: true, reviewRequests: true, drafts: true, repositories: [] });
});

test('makes one query for each enabled list', () => {
  assert.deepEqual(PullRequestFilters.queries(PullRequestFilters.defaults()), ['is:pr is:open author:@me', 'is:pr is:open review-requested:@me']);
  assert.deepEqual(PullRequestFilters.queries({ ...PullRequestFilters.defaults(), createdByMe: false }), ['is:pr is:open review-requested:@me']);
  assert.deepEqual(PullRequestFilters.queries({ ...PullRequestFilters.defaults(), createdByMe: false, reviewRequests: false }), []);
});

test('narrows every query by drafts and repositories', () => {
  const filters = { createdByMe: true, reviewRequests: true, drafts: false, repositories: ['acme/web', 'valsar6/VivArcDi'] };
  assert.deepEqual(PullRequestFilters.queries(filters), [
    'is:pr is:open author:@me draft:false repo:acme/web repo:valsar6/VivArcDi',
    'is:pr is:open review-requested:@me draft:false repo:acme/web repo:valsar6/VivArcDi',
  ]);
});

test('reads stored filters and falls back to the defaults for anything wrong', () => {
  assert.deepEqual(PullRequestFilters.from(null), PullRequestFilters.defaults());
  assert.deepEqual(PullRequestFilters.from({ createdByMe: 'yes', drafts: false, repositories: ['acme/web', 3, 'nonsense'] }), {
    createdByMe: true,
    reviewRequests: true,
    drafts: false,
    repositories: ['acme/web'],
  });
});

test('flips one filter and keeps the others', () => {
  assert.deepEqual(PullRequestFilters.toggled(PullRequestFilters.defaults(), 'drafts'), { ...PullRequestFilters.defaults(), drafts: false });
});

test('keeps only valid repository names, each once', () => {
  assert.deepEqual(PullRequestFilters.parseRepositories(' acme/web \r\nnot a repo\nacme/web\n\nvalsar6/VivArcDi\nhttps://github.com/a/b'), ['acme/web', 'valsar6/VivArcDi']);
  assert.equal(PullRequestFilters.formatRepositories(['a/b', 'c/d']), 'a/b\nc/d');
  assert.deepEqual(PullRequestFilters.parseRepositories(''), []);
});
