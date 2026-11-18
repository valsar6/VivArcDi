import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Driver } from '../Driver.js';
import type { CheckResult } from '../Report.js';
import type { Check, Session } from '../Session.js';

export interface Scenario {
  name: string;
  spec: string;
  run(driver: Driver): Promise<void>;
}

const SCENARIO_SUFFIX = '.live.ts';

export class ScenarioCheck implements Check {
  #scenario: Scenario;

  /**
   * Runs one scenario from a single tab in the first workspace.
   *
   * @param scenario The scenario.
   */
  constructor(scenario: Scenario) {
    this.#scenario = scenario;
  }

  /**
   * @param session The running lab Vivaldi.
   * @returns One result named after the scenario.
   */
  public async run({ driver }: Session): Promise<CheckResult[]> {
    const { name, spec } = this.#scenario;
    try {
      await driver.reset();
      await this.#scenario.run(driver);
      return [{ name, outcome: 'pass', detail: `spec ${spec}` }];
    } catch (error) {
      return [{ name, outcome: 'fail', detail: error instanceof Error ? error.message : String(error) }];
    }
  }
}

export class ScenarioCatalog {
  /**
   * Loads every `*.live.ts` file of a folder; each default-exports a {@link Scenario}.
   *
   * @param folder Usually `tests/live/scenarios`.
   * @returns The scenarios, sorted by file name.
   */
  public static async load(folder: string): Promise<Scenario[]> {
    const files = (await readdir(folder)).filter((file) => file.endsWith(SCENARIO_SUFFIX)).sort();
    const modules = await Promise.all(
      files.map(async (file) => (await import(pathToFileURL(join(folder, file)).href)) as { default: Scenario }),
    );
    return modules.map((module) => module.default);
  }

  /**
   * @param scenarios All scenarios.
   * @param only Scenario names or spec numbers to keep; empty keeps all.
   * @returns The scenarios that match.
   */
  public static select(scenarios: Scenario[], only: string[]): Scenario[] {
    return only.length === 0 ? scenarios : scenarios.filter((item) => only.includes(item.name) || only.includes(item.spec));
  }
}
