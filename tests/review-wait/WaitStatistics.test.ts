import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaitStatistics } from '../../scripts/review-wait/WaitStatistics.js';

test('summarises waits with count, median and longest', () => {
  assert.deepEqual(WaitStatistics.summarise([30, 10, 20]), { count: 3, median: 20, longest: 30 });
  assert.deepEqual(WaitStatistics.summarise([40, 10, 30, 20]), { count: 4, median: 25, longest: 40 });
  assert.deepEqual(WaitStatistics.summarise([]), { count: 0, median: 0, longest: 0 });
});
