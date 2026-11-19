import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReportFolder } from '../../scripts/review-wait/ReportFolder.js';

const ROOT = '/repo';
const DAY = '2026-11-19';

test('saves the report in the private folder when there is one', () => {
  const file = ReportFolder.resolve({ out: null, root: ROOT, exists: (path) => path === '/repo/.claude', day: DAY });
  assert.equal(file, '/repo/.claude/review-wait/2026-11-19.md');
});

test('saves the report in the folder given by out', () => {
  const file = ReportFolder.resolve({ out: '/tmp/reports', root: ROOT, exists: () => true, day: DAY });
  assert.equal(file, '/tmp/reports/2026-11-19.md');
});

test('falls back to build when there is no private folder', () => {
  const file = ReportFolder.resolve({ out: null, root: ROOT, exists: () => false, day: DAY });
  assert.equal(file, '/repo/build/review-wait/2026-11-19.md');
});
