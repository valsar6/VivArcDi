import { setTimeout as sleep } from 'node:timers/promises';
import type { ConsoleLog } from '../ConsoleLog.js';
import type { CheckResult } from '../Report.js';
import type { Check, Session } from '../Session.js';

export const BOOT_CHECK_NAME = 'boot check finds the active line';

const ACTIVE_LINE = /active on Vivaldi .*modules: ([^)]*)\)/;
const WAIT_MS = 30_000;
const POLL_MS = 250;

export class BootCheck implements Check {
  #enabled: string[];
  #waitMs: number;

  /**
   * Proves that the payload booted: the active line appeared, it lists every enabled module, and
   * no VivArcDi error was logged.
   *
   * @param enabled Ids of the modules enabled in `dist/config.json`.
   * @param waitMs How long to wait for the active line.
   */
  constructor(enabled: string[], waitMs = WAIT_MS) {
    this.#enabled = enabled;
    this.#waitMs = waitMs;
  }

  /**
   * @param session The running lab Vivaldi.
   * @returns One result named {@link BOOT_CHECK_NAME}.
   */
  public async run({ console }: Session): Promise<CheckResult[]> {
    const started = await this.#startedModules(console);
    if (started === null) {
      return [this.#result('fail', 'the active line did not appear within 30 seconds')];
    }
    const missing = this.#enabled.filter((id) => !started.includes(id));
    const problems = [
      ...missing.map((id) => `module ${id} did not start`),
      ...console.errors.map((line) => line.text),
    ];
    return [problems.length === 0 ? this.#result('pass', `${started.length} modules started`) : this.#result('fail', problems.join('; '))];
  }

  async #startedModules(console: ConsoleLog): Promise<string[] | null> {
    const deadline = Date.now() + this.#waitMs;
    do {
      const match = console.lines.map((line) => ACTIVE_LINE.exec(line.text)).find((found) => found !== null);
      if (match) {
        return (match[1] ?? '').split(',').map((id) => id.trim()).filter((id) => id !== '' && id !== 'none');
      }
      await sleep(POLL_MS);
    } while (Date.now() < deadline);
    return null;
  }

  #result(outcome: CheckResult['outcome'], detail: string): CheckResult {
    return { name: BOOT_CHECK_NAME, outcome, detail };
  }
}
