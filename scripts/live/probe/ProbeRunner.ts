import type { Driver } from '../Driver.js';
import { ProbeGuard } from './ProbeGuard.js';

export class ProbeRunner {
  #driver: Driver;

  /**
   * Runs read-only probe scripts in window.html, the automated twin of the scripts pasted into DevTools.
   *
   * @param driver Driver attached to window.html.
   */
  constructor(driver: Driver) {
    this.#driver = driver;
  }

  /**
   * Checks a probe and evaluates it as the body of an async function. A probe either returns its
   * result or stores it in `globalThis.vivarcdiResult`, as the pasted probes do.
   *
   * @param source Probe source code.
   * @returns The probe's result, copied as JSON.
   * @throws {Error} When the probe calls a write API; it is not run.
   */
  public async run(source: string): Promise<unknown> {
    const writes = ProbeGuard.writeCalls(source);
    if (writes.length > 0) {
      throw new Error(`The probe was not run because it writes data: ${writes.join(', ')}`);
    }
    const returned = await this.#driver.evaluate<unknown>(`(async () => {\n${source}\n})()`);
    return returned ?? this.#driver.evaluate<unknown>('globalThis.vivarcdiResult');
  }
}
