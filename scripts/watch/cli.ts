import { spawn } from 'node:child_process';
import { appendFile, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { CheckResult } from '../live/Report.js';
import { AptIndex } from './AptIndex.js';
import type { Channel } from './IssueText.js';
import { IssueTracker } from './IssueTracker.js';
import { PackageFetcher } from './PackageFetcher.js';
import { WatchRun } from './WatchRun.js';
import type { WatchParts } from './WatchRun.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIVE_REPORT = join(ROOT, 'build', 'live');

function runLive(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', '-s', 'live', '--', ...args], { cwd: ROOT, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', () => resolve());
  });
}

async function readReport(): Promise<{ results: CheckResult[] } | null> {
  try {
    return JSON.parse(await readFile(join(LIVE_REPORT, 'report.json'), 'utf8')) as { results: CheckResult[] };
  } catch {
    return null;
  }
}

function runUrl(env: NodeJS.ProcessEnv): string {
  const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: run } = env;
  return server && repository && run ? `${server}/${repository}/actions/runs/${run}` : 'a local run';
}

function reporter(env: NodeJS.ProcessEnv, issues: boolean): WatchParts['report'] {
  const { GITHUB_REPOSITORY: repository, GITHUB_TOKEN: token } = env;
  if (!issues || !repository || !token) {
    return () => Promise.resolve('issues disabled');
  }
  const tracker = new IssueTracker(repository, token);
  return (result) => tracker.report(result);
}

function parts(env: NodeJS.ProcessEnv, issues: boolean): WatchParts {
  const summaryFile = env['GITHUB_STEP_SUMMARY'];
  return {
    index: () => AptIndex.download(),
    fetchPackage: (entry, folder) => new PackageFetcher().fetch(entry, folder),
    runLive: async (args): Promise<void> => {
      await rm(LIVE_REPORT, { recursive: true, force: true });
      await runLive(args);
    },
    readReport,
    report: reporter(env, issues),
    summary: async (markdown) => (summaryFile ? appendFile(summaryFile, markdown) : console.log(markdown)),
    runUrl: runUrl(env),
    workDir: join(ROOT, 'build', 'watch'),
  };
}

async function dependencies(channel: Channel): Promise<string> {
  const entry = (await AptIndex.download()).newest(`vivaldi-${channel}`);
  return entry.depends.map(([first]) => first).join(' ');
}

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { channel: { type: 'string', default: 'snapshot' }, 'no-issues': { type: 'boolean', default: false } },
  });
  const channel: Channel = values.channel === 'stable' ? 'stable' : 'snapshot';
  if (positionals[0] === 'deps') {
    console.log(await dependencies(channel));
    return 0;
  }
  if (positionals[0] === 'run') {
    const { result, action } = await new WatchRun(parts(process.env, !values['no-issues'])).run(channel);
    const output = process.env['GITHUB_OUTPUT'];
    if (output) {
      await appendFile(output, `version=${result.version}\noutcome=${result.outcome}\n`);
    }
    console.log(`Vivaldi ${channel} ${result.version}: ${result.outcome}, ${action}`);
    return 0;
  }
  console.error('Usage: watch deps|run --channel snapshot|stable [--no-issues]');
  return 2;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
