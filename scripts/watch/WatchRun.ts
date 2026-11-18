import { join } from 'node:path';
import { RUN_FAILURE } from '../live/LiveRun.js';
import type { CheckResult } from '../live/Report.js';
import type { AptIndex, PackageEntry } from './AptIndex.js';
import { upstreamVersion } from './DebianVersion.js';
import { IssueText } from './IssueText.js';
import type { Channel, Failure, WatchResult } from './IssueText.js';

export interface WatchParts {
  index(): Promise<AptIndex>;
  fetchPackage(entry: PackageEntry, folder: string): Promise<string>;
  runLive(args: string[]): Promise<void>;
  readReport(): Promise<{ results: CheckResult[] } | null>;
  report(result: WatchResult): Promise<string>;
  summary(markdown: string): Promise<void>;
  runUrl: string;
  workDir: string;
}

const UNKNOWN = 'unknown';

class InfrastructureFailure extends Error {}

export class WatchRun {
  #parts: WatchParts;

  /**
   * One channel of the snapshot watch: newest build, unpack, live checks, issue, job summary.
   *
   * @param parts The steps; fakes in tests.
   */
  constructor(parts: WatchParts) {
    this.#parts = parts;
  }

  /**
   * @param channel The Vivaldi channel to check.
   * @returns The result and what was done with the issues.
   * @throws {Error} When the issues cannot be updated; the job must then fail.
   */
  public async run(channel: Channel): Promise<{ result: WatchResult; action: string }> {
    const result = await this.#check(channel);
    const action = await this.#parts.report(result);
    await this.#parts.summary(`${IssueText.report(result)}\n\nIssues: ${action}\n`);
    return { result, action };
  }

  async #check(channel: Channel): Promise<WatchResult> {
    let version = UNKNOWN;
    try {
      const entry = (await this.#stage('apt index', () => this.#parts.index())).newest(`vivaldi-${channel}`);
      version = upstreamVersion(entry.version);
      const folder = join(this.#parts.workDir, channel);
      const root = await this.#stage('download', () => this.#parts.fetchPackage(entry, folder));
      await this.#parts.runLive(['--channel', channel, '--vivaldi', root, '--vivaldi-version', version, '--no-sandbox']);
      return this.#classify(channel, version, await this.#parts.readReport());
    } catch (error) {
      const failure = { name: error instanceof InfrastructureFailure ? 'setup' : RUN_FAILURE, detail: String(error) };
      return this.#result(channel, version, 'infrastructure', [failure]);
    }
  }

  async #stage<T>(name: string, step: () => Promise<T>): Promise<T> {
    try {
      return await step();
    } catch (error) {
      throw new InfrastructureFailure(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  #classify(channel: Channel, version: string, report: { results: CheckResult[] } | null): WatchResult {
    if (report === null) {
      return this.#result(channel, version, 'infrastructure', [{ name: RUN_FAILURE, detail: 'no report was written' }]);
    }
    const failures = report.results
      .filter((item) => item.outcome === 'fail')
      .map(({ name, detail }) => ({ name, detail }));
    if (failures.length === 0) {
      return this.#result(channel, version, 'pass', []);
    }
    const outcome = failures.every((item) => item.name === RUN_FAILURE) ? 'infrastructure' : 'fail';
    return this.#result(channel, version, outcome, failures);
  }

  #result(channel: Channel, version: string, outcome: WatchResult['outcome'], failures: Failure[]): WatchResult {
    return { channel, version, outcome, failures, runUrl: this.#parts.runUrl };
  }
}
