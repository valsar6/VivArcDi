import type { CdpConnection } from './cdp/CdpConnection.js';
import type { CatalogFile } from './checks/SelectorCheck.js';
import { Cleanup } from './Cleanup.js';
import { ConsoleLog } from './ConsoleLog.js';
import { Driver } from './Driver.js';
import type { LabBuild } from './LabVivaldi.js';
import type { CheckResult, Report, RunFacts } from './Report.js';
import type { Check, Session } from './Session.js';

export interface LabProfile {
  path: string;
  remove(): Promise<void>;
}

export interface RunningVivaldi {
  endpoint: string;
  stop(): Promise<void>;
}

export interface LiveRunParts {
  prepareLab(): Promise<LabBuild>;
  createProfile(): Promise<LabProfile>;
  launch(executable: string, profile: string): Promise<RunningVivaldi>;
  attach(endpoint: string): Promise<CdpConnection>;
  catalog(vivaldiVersion: string): Promise<CatalogFile>;
  checks(catalog: CatalogFile): Check[];
  report: Report;
  payloadVersion: string;
}

const RUN_FAILURE = 'live run';

export class LiveRun {
  #parts: LiveRunParts;
  #cleanup: Cleanup;
  #facts: RunFacts;

  /**
   * One live verification run: prepare the lab, start Vivaldi, run the checks, report, clean up.
   *
   * @param parts The steps of a run; fakes in tests.
   * @param cleanup Undo steps, also run when the process is interrupted.
   */
  constructor(parts: LiveRunParts, cleanup: Cleanup = new Cleanup()) {
    this.#parts = parts;
    this.#cleanup = cleanup;
    this.#facts = { vivaldiVersion: 'unknown', payloadVersion: parts.payloadVersion, catalogVersion: null };
  }

  /**
   * Runs every check and writes the report; Vivaldi and the profile are gone when it returns.
   *
   * @returns The exit code: 0 when every check passed or was not checked, 1 otherwise.
   */
  public async run(): Promise<number> {
    const { report } = this.#parts;
    let console: ConsoleLog | null = null;
    try {
      const opened = await this.#open();
      console = opened.session.console;
      for (const check of this.#parts.checks(opened.catalog)) {
        await this.#runCheck(check, opened.session);
      }
    } catch (error) {
      report.add([{ name: RUN_FAILURE, outcome: 'fail', detail: error instanceof Error ? error.message : String(error) }]);
    } finally {
      report.setConsole(console?.lines ?? []);
      await report.write(this.#facts);
      await this.#cleanup.run();
    }
    return report.failed ? 1 : 0;
  }

  /**
   * Starts the lab Vivaldi, hands the session to an action, then cleans up.
   *
   * @param action What to do with the running Vivaldi, e.g. run a probe.
   * @returns What the action returned.
   */
  public async with<T>(action: (session: Session) => Promise<T>): Promise<T> {
    try {
      return await action((await this.#open()).session);
    } finally {
      await this.#cleanup.run();
    }
  }

  async #open(): Promise<{ session: Session; catalog: CatalogFile }> {
    const parts = this.#parts;
    const lab = await parts.prepareLab();
    this.#facts.vivaldiVersion = lab.vivaldiVersion;
    const profile = await parts.createProfile();
    this.#cleanup.add(() => profile.remove());
    const vivaldi = await parts.launch(lab.executable, profile.path);
    this.#cleanup.add(() => vivaldi.stop());
    const cdp = await parts.attach(vivaldi.endpoint);
    this.#cleanup.add(() => cdp.close());
    const console = new ConsoleLog(cdp);
    await cdp.send('Runtime.enable');
    const catalog = await parts.catalog(lab.vivaldiVersion);
    this.#facts.catalogVersion = catalog.version;
    return { session: { driver: new Driver(cdp, catalog.selectors), console }, catalog };
  }

  async #runCheck(check: Check, session: Session): Promise<void> {
    const results = await check.run(session);
    this.#parts.report.add(results);
    const failed = results.filter((result: CheckResult) => result.outcome === 'fail');
    const first = failed[0];
    if (first === undefined) {
      return;
    }
    const png = await session.driver.screenshot().catch(() => null);
    if (png !== null) {
      await this.#parts.report.saveScreenshot(first.name, png, failed);
    }
  }
}
