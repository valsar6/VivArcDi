import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GhCli } from '../../scripts/review-wait/GhCli.js';

const RAW = JSON.stringify([
  {
    number: 7,
    title: 'Add the thing',
    createdAt: '2026-11-01T10:00:00Z',
    mergedAt: '2026-11-02T12:00:00Z',
    headRefName: 'feat/thing',
    files: [{ path: 'specs/049-review-wait/spec.md', changeType: 'ADDED', additions: 3 }],
  },
]);

test('calls only read commands of gh', async () => {
  const calls: string[][] = [];
  const source = new GhCli(async (args) => {
    calls.push(args);
    return RAW;
  });
  assert.throws(() => source.run(['pr', 'merge', '7']), /not a read command/);
  assert.throws(() => source.run(['issue', 'create']), /not a read command/);
  assert.throws(() => source.run([]), /not a read command/);
  assert.equal(calls.length, 0);

  const pullRequests = await source.merged();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls.map(([group, action]) => `${group} ${action}`), ['pr list']);
  assert.deepEqual(pullRequests, [
    {
      number: 7,
      title: 'Add the thing',
      branch: 'feat/thing',
      createdAt: new Date('2026-11-01T10:00:00Z'),
      mergedAt: new Date('2026-11-02T12:00:00Z'),
      files: [{ path: 'specs/049-review-wait/spec.md', changeType: 'ADDED' }],
    },
  ]);
});
