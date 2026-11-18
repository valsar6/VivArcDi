import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SelectorCatalog } from '../../../src/core/dom/SelectorCatalog.js';
import type { Driver } from '../Driver.js';
import type { CheckResult } from '../Report.js';
import type { Check, Session } from '../Session.js';
import { DEFAULT_STATE, SELECTOR_STATES } from './SelectorStates.js';
import type { SelectorState, StateMap } from './SelectorStates.js';

export interface CatalogFile {
  version: string | null;
  selectors: Record<string, string>;
}

export class SelectorCheck implements Check {
  #selectors: Record<string, string>;
  #states: StateMap;
  #known: Record<string, SelectorState>;

  /**
   * Resolves every selector of the catalog in window.html, entering the state each one needs.
   *
   * @param selectors The catalog of the running Vivaldi version.
   * @param states Selector name to state name, or to `{ notChecked: reason }`; others need no state.
   * @param known The states the harness can enter.
   */
  constructor(selectors: Record<string, string>, states: StateMap, known: Record<string, SelectorState> = SELECTOR_STATES) {
    this.#selectors = selectors;
    this.#states = states;
    this.#known = known;
  }

  /**
   * Reads the selector file the payload would use, with the same version matching.
   *
   * @param folder The `src/selectors` folder.
   * @param vivaldiVersion Full Vivaldi version, e.g. `8.3.4191.44`.
   * @returns The chosen catalog version and its selectors; empty when no catalog fits.
   */
  public static async catalogFor(folder: string, vivaldiVersion: string): Promise<CatalogFile> {
    const index = JSON.parse(await readFile(join(folder, 'index.json'), 'utf8')) as { versions: string[] };
    const version = SelectorCatalog.bestMatch(index.versions, vivaldiVersion);
    if (version === null) {
      return { version, selectors: {} };
    }
    const selectors = JSON.parse(await readFile(join(folder, `${version}.json`), 'utf8')) as Record<string, string>;
    return { version, selectors };
  }

  /**
   * @param session The running lab Vivaldi.
   * @returns One result per selector, named `selector <name>`.
   */
  public async run({ driver }: Session): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    for (const [state, names] of this.#byState()) {
      results.push(...(await this.#checkState(driver, state, names)));
    }
    return results;
  }

  #byState(): Map<string | null, string[]> {
    const groups = new Map<string | null, string[]>();
    for (const name of Object.keys(this.#selectors)) {
      const entry = this.#states[name] ?? DEFAULT_STATE;
      const state = typeof entry === 'string' ? entry : null;
      groups.set(state, [...(groups.get(state) ?? []), name]);
    }
    return groups;
  }

  async #checkState(driver: Driver, state: string | null, names: string[]): Promise<CheckResult[]> {
    const strategy = state === null ? undefined : this.#known[state];
    if (strategy === undefined) {
      return names.map((name) => this.#result(name, 'not checked', this.#reason(name, state)));
    }
    try {
      await strategy.enter(driver);
    } catch (error) {
      return names.map((name) => this.#result(name, 'fail', `could not enter ${state}: ${String(error)}`));
    }
    const results = await Promise.all(names.map((name) => this.#probe(driver, name, state ?? DEFAULT_STATE)));
    await strategy.leave(driver).catch(() => undefined);
    return results;
  }

  async #probe(driver: Driver, name: string, state: string): Promise<CheckResult> {
    const css = this.#selectors[name] ?? '';
    const found = await driver.exists(css).catch(() => false);
    return this.#result(name, found ? 'pass' : 'fail', `${css} in ${state}`);
  }

  #reason(name: string, state: string | null): string {
    const entry = this.#states[name];
    return typeof entry === 'object' ? entry.notChecked : `unknown state ${state}`;
  }

  #result(name: string, outcome: CheckResult['outcome'], detail: string): CheckResult {
    return { name: `selector ${name}`, outcome, detail };
  }
}
