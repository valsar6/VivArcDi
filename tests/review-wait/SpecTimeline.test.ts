import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpecTimeline } from '../../scripts/review-wait/SpecTimeline.js';
import { pullRequest } from './builders.js';

const HOUR = 3_600_000;
const SPEC = 'specs/049-review-wait/spec.md';
const CODE = 'src/core/boot/Module.ts';

test('computes the wait from opening to merge', () => {
  const timeline = SpecTimeline.build(
    [pullRequest(1, [[SPEC, 'ADDED']], '2026-11-01T00:00:00Z', '2026-11-01T05:00:00Z')],
    null,
  );
  assert.equal(timeline.specs[0]?.waits.spec, 5 * HOUR);
});

test('computes the wait of the manual checks of a spec', () => {
  const timeline = SpecTimeline.build(
    [
      pullRequest(1, [[CODE, 'MODIFIED'], [SPEC, 'MODIFIED']], '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z'),
      pullRequest(2, [[CODE, 'MODIFIED'], [SPEC, 'MODIFIED']], '2026-11-02T00:00:00Z', '2026-11-03T00:00:00Z'),
      pullRequest(3, [[SPEC, 'MODIFIED']], '2026-11-04T00:00:00Z', '2026-11-05T12:00:00Z'),
    ],
    null,
  );
  assert.equal(timeline.specs[0]?.manual, 60 * HOUR);
  assert.equal(timeline.specs[0]?.cycle, 4 * 24 * HOUR + 12 * HOUR);
});

test('summarises each stage with count, median and longest wait', () => {
  const timeline = SpecTimeline.build(
    [
      pullRequest(1, [[SPEC, 'ADDED']], '2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z'),
      pullRequest(2, [['specs/050-other/spec.md', 'ADDED']], '2026-11-01T00:00:00Z', '2026-11-01T03:00:00Z'),
      pullRequest(3, [['specs/049-review-wait/spec.md', 'MODIFIED'], ['specs/050-other/spec.md', 'MODIFIED']], '2026-11-02T00:00:00Z', '2026-11-02T02:00:00Z'),
    ],
    null,
  );
  assert.deepEqual(timeline.stages.spec, { count: 2, median: 2 * HOUR, longest: 3 * HOUR });
  assert.deepEqual(timeline.stages.implemented, { count: 1, median: 2 * HOUR, longest: 2 * HOUR });
  assert.equal(timeline.specs.length, 2);
});

test('keeps pull requests without a spec out of the stages', () => {
  const timeline = SpecTimeline.build(
    [pullRequest(1, [[CODE, 'MODIFIED']], '2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z')],
    null,
  );
  assert.equal(timeline.apart, 1);
  assert.equal(timeline.stages.code.count, 0);
  assert.deepEqual(timeline.specs, []);
});

test('ignores pull requests merged before since', () => {
  const timeline = SpecTimeline.build(
    [
      pullRequest(1, [[SPEC, 'ADDED']], '2026-10-01T00:00:00Z', '2026-10-01T01:00:00Z'),
      pullRequest(2, [[SPEC, 'ADDED']], '2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z'),
    ],
    new Date('2026-11-01T00:00:00Z'),
  );
  assert.equal(timeline.stages.spec.count, 1);
  assert.equal(timeline.apart, 0);
});
