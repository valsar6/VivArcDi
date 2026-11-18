import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IssueText } from '../../scripts/watch/IssueText.js';
import type { WatchResult } from '../../scripts/watch/IssueText.js';
import { IssueTracker } from '../../scripts/watch/IssueTracker.js';

interface FakeIssue {
  number: number;
  title: string;
  labels: string[];
  state: 'open' | 'closed';
  comments: string[];
  body: string;
}

class FakeGitHub {
  issues: FakeIssue[] = [];
  requests: string[] = [];

  seed(title: string, labels: string[]): FakeIssue {
    const issue = { number: this.issues.length + 1, title, labels: [...labels], state: 'open' as const, comments: [], body: '' };
    this.issues.push(issue);
    return issue;
  }

  fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? 'GET';
    const path = url.replace('https://api.github.com/repos/valsar6/VivArcDi/', '');
    this.requests.push(`${method} ${path.split('?')[0]}`);
    const body = (typeof init?.body === 'string' ? JSON.parse(init.body) : {}) as Record<string, unknown>;
    return Response.json(this.#route(method, path, body));
  };

  #route(method: string, path: string, body: Record<string, unknown>): unknown {
    const [, number, rest] = /^issues\/(\d+)\/?(\w*)/.exec(path) ?? [];
    const issue = this.issues.find((item) => item.number === Number(number));
    if (method === 'GET') {
      const labels = decodeURIComponent(/labels=([^&]+)/.exec(path)?.[1] ?? '').split(',');
      return this.issues.filter((item) => item.state === 'open' && labels.every((label) => item.labels.includes(label)));
    }
    if (issue === undefined) {
      const created = this.seed(String(body['title']), body['labels'] as string[]);
      created.body = String(body['body']);
      return created;
    }
    if (rest === 'comments') {
      issue.comments.push(String(body['body']));
    } else if (rest === 'labels') {
      issue.labels.push(...(body['labels'] as string[]));
    } else {
      issue.state = body['state'] as 'closed';
    }
    return issue;
  }
}

const RUN = 'https://github.com/valsar6/VivArcDi/actions/runs/7';
const CHANNEL = ['snapshot-watch', 'channel:snapshot'];

function result(outcome: WatchResult['outcome'], version = '8.4.4226.3'): WatchResult {
  const failures = outcome === 'pass' ? [] : [{ name: 'selector tabStrip', detail: '#tabs-container .tab-strip in default' }];
  return { channel: 'snapshot', version, outcome, failures, runUrl: RUN };
}

function tracker(github: FakeGitHub): IssueTracker {
  return new IssueTracker('valsar6/VivArcDi', 'token', github.fetch);
}

test('a failed run opens one issue per channel and version', async () => {
  const github = new FakeGitHub();
  github.seed(IssueText.title('snapshot', '8.4.4226.1'), CHANNEL);

  const done = await tracker(github).report(result('fail'));

  assert.equal(done, 'opened #2');
  const opened = github.issues[1];
  assert.equal(opened?.title, 'Vivaldi snapshot 8.4.4226.3 breaks VivArcDi');
  assert.deepEqual(opened?.labels, CHANNEL);
  assert.match(opened?.body ?? '', /\| selector tabStrip \| #tabs-container \.tab-strip in default \|/);
  assert.match(opened?.body ?? '', /Artifact `live-snapshot-8\.4\.4226\.3`/);
  assert.equal(github.issues[0]?.state, 'open');
});

test('a failed run comments on the open issue', async () => {
  const github = new FakeGitHub();
  const existing = github.seed(IssueText.title('snapshot', '8.4.4226.3'), CHANNEL);

  const done = await tracker(github).report(result('fail'));

  assert.equal(done, 'commented on #1');
  assert.equal(github.issues.length, 1);
  assert.match(existing.comments[0] ?? '', /fails the live checks/);
});

test('a passing run closes the open issue of its channel', async () => {
  const github = new FakeGitHub();
  const broken = github.seed(IssueText.title('snapshot', '8.4.4226.1'), CHANNEL);
  const stable = github.seed(IssueText.title('stable', '8.3.4191.44'), ['snapshot-watch', 'channel:stable']);

  const done = await tracker(github).report(result('pass', '8.4.4226.10'));

  assert.equal(done, 'closed #1');
  assert.equal(broken.state, 'closed');
  assert.match(broken.comments[0] ?? '', /Vivaldi snapshot 8\.4\.4226\.10 passes the live checks/);
  assert.equal(stable.state, 'open');
});

test('an infrastructure failure is labelled on the newest open issue, or opens a labelled one', async () => {
  const github = new FakeGitHub();
  const fresh = await tracker(github).report(result('infrastructure'));
  const older = github.seed(IssueText.title('snapshot', '8.4.4226.1'), CHANNEL);

  const again = await tracker(github).report(result('infrastructure', '8.4.4226.10'));

  assert.equal(fresh, 'opened #1');
  assert.deepEqual(github.issues[0]?.labels, [...CHANNEL, 'infrastructure']);
  assert.equal(again, 'commented on #2');
  assert.deepEqual(older.labels, [...CHANNEL, 'infrastructure']);
  assert.match(older.comments[0] ?? '', /infrastructure failure, not a broken selector/);
});

test('a GitHub error stops the report', async () => {
  const refusing = new IssueTracker('valsar6/VivArcDi', 'token', async () => new Response('', { status: 403 }));

  await assert.rejects(refusing.report(result('fail')), /HTTP 403/);
});
