import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, ReportText } from '../../scripts/review-wait/ReportText.js';
import type { Timeline } from '../../scripts/review-wait/SpecTimeline.js';

const HOUR = 3_600_000;
const EMPTY = { count: 0, median: 0, longest: 0 };

const timeline: Timeline = {
  stages: {
    spec: { count: 2, median: 7 * HOUR, longest: 8 * HOUR },
    design: EMPTY,
    code: { count: 1, median: 77 * HOUR, longest: 77 * HOUR },
    implemented: EMPTY,
  },
  specs: [{ spec: '049-review-wait', waits: { spec: 7 * HOUR, code: 77 * HOUR }, cycle: 100 * HOUR, manual: null }],
  apart: 3,
};
const context = { since: new Date('2026-11-01T00:00:00Z'), today: new Date('2026-11-19T10:00:00Z') };

test('ReportText writes the tables of a fixed timeline', () => {
  const text = ReportText.write(timeline, context);
  assert.ok(text.includes('Period: merged since 2026-11-01. Run on 2026-11-19.'));
  assert.ok(text.includes('| Spec | 2 | 7 h | 8 h |'));
  assert.ok(text.includes('| Design | 0 | – | – |'));
  assert.ok(text.includes('| 049-review-wait | 7 h | – | 3 d 5 h | – | – | 4 d 4 h |'));
  assert.ok(text.includes('Counted apart (no spec or no stage): 3'));
});

test('ReportText formats durations in hours and days', () => {
  assert.equal(formatDuration(7 * HOUR), '7 h');
  assert.equal(formatDuration(77 * HOUR), '3 d 5 h');
  assert.equal(formatDuration(null), '–');
  assert.equal(formatDuration(undefined), '–');
});

test('ReportText states that GitHub does not tell Tore from the agent', () => {
  const text = ReportText.write(timeline, { ...context, since: null });
  assert.ok(text.includes('GitHub does not tell Tore from the agent.'));
  assert.ok(text.includes('Period: all merged pull requests.'));
});
