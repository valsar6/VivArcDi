import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../../scripts/live/Report.js';
import { AptIndex } from '../../scripts/watch/AptIndex.js';
import type { WatchResult } from '../../scripts/watch/IssueText.js';
import { WatchRun } from '../../scripts/watch/WatchRun.js';
import type { WatchParts } from '../../scripts/watch/WatchRun.js';

const PACKAGES = readFileSync(join(import.meta.dirname, 'fixtures', 'Packages'), 'utf8');

interface Recorded {
  live: string[][];
  reported: WatchResult[];
  summaries: string[];
}

function watch(overrides: Partial<WatchParts>, results: CheckResult[] | null = []): { run: WatchRun; seen: Recorded } {
  const seen: Recorded = { live: [], reported: [], summaries: [] };
  const parts: WatchParts = {
    index: async () => new AptIndex(PACKAGES),
    fetchPackage: async (_entry, folder) => join(folder, 'root'),
    runLive: async (args) => void seen.live.push(args),
    readReport: async () => (results === null ? null : { results }),
    report: async (result) => {
      seen.reported.push(result);
      return 'opened #1';
    },
    summary: async (markdown) => void seen.summaries.push(markdown),
    runUrl: 'https://github.com/valsar6/VivArcDi/actions/runs/7',
    workDir: '/work',
    ...overrides,
  };
  return { run: new WatchRun(parts), seen };
}

const failed = (name: string): CheckResult => ({ name, outcome: 'fail', detail: `${name} broke` });

test('checks the newest build of the channel with the live harness', async () => {
  const { run, seen } = watch({});

  const { result, action } = await run.run('snapshot');

  assert.deepEqual(seen.live, [
    ['--channel', 'snapshot', '--vivaldi', '/work/snapshot/root', '--vivaldi-version', '8.4.4226.10', '--no-sandbox'],
  ]);
  assert.equal(result.outcome, 'pass');
  assert.equal(result.version, '8.4.4226.10');
  assert.equal(action, 'opened #1');
  assert.match(seen.summaries[0] ?? '', /Vivaldi snapshot 8\.4\.4226\.10 passes the live checks[\s\S]*Issues: opened #1/);
});

test('a failed check is a broken build', async () => {
  const { run } = watch({}, [{ name: 'selector browser', outcome: 'pass', detail: '' }, failed('selector tabStrip')]);

  const { result } = await run.run('stable');

  assert.equal(result.outcome, 'fail');
  assert.equal(result.version, '8.3.4191.44');
  assert.deepEqual(result.failures, [{ name: 'selector tabStrip', detail: 'selector tabStrip broke' }]);
});

test('failures before the checks are labelled infrastructure', async () => {
  const index = watch({ index: async () => Promise.reject(new Error('HTTP 503')) });
  const download = watch({ fetchPackage: async () => Promise.reject(new Error('SHA256 differs')) });
  const start = watch({}, [failed('live run')]);
  const silent = watch({}, null);

  const outcomes = await Promise.all([index, download, start, silent].map(async ({ run }) => (await run.run('snapshot')).result));

  const [fromIndex, fromDownload] = outcomes as [WatchResult, WatchResult];
  assert.deepEqual(outcomes.map((result) => result.outcome), ['infrastructure', 'infrastructure', 'infrastructure', 'infrastructure']);
  assert.equal(fromIndex.version, 'unknown');
  assert.match(String(fromIndex.failures[0]?.detail), /apt index: HTTP 503/);
  assert.match(String(fromDownload.failures[0]?.detail), /download: SHA256 differs/);
  assert.equal(fromDownload.version, '8.4.4226.10');
  assert.equal(download.seen.live.length, 0);
});

test('a failure to update the issues fails the run', async () => {
  const { run, seen } = watch({ report: async () => Promise.reject(new Error('GitHub answered HTTP 403')) });

  await assert.rejects(run.run('snapshot'), /HTTP 403/);
  assert.deepEqual(seen.summaries, []);
});
