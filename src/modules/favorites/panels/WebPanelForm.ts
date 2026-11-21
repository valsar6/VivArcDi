import type { PanelBar } from './PanelBar.js';

export interface WebPanelFormDependencies {
  bar: Pick<PanelBar, 'openForm' | 'fill' | 'submit' | 'panelIds'>;
  sleep?: (ms: number) => Promise<void>;
  /** How long each step waits for Vivaldi, in milliseconds. */
  timeoutMs?: number;
}

const STEP_MS = 50;
const TIMEOUT_MS = 3_000;

export class WebPanelForm {
  #bar: WebPanelFormDependencies['bar'];
  #sleep: (ms: number) => Promise<void>;
  #timeoutMs: number;

  /**
   * Adds a web panel through Vivaldi's own form: opens it, types the address, submits it and waits
   * for the new panel's button. Vivaldi then creates the panel, reads its title and icon from the
   * page and opens the side panel.
   *
   * @param dependencies The panel bar, and optionally the wait and its limit.
   */
  constructor({ bar, sleep, timeoutMs }: WebPanelFormDependencies) {
    this.#bar = bar;
    this.#sleep = sleep ?? ((ms): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#timeoutMs = timeoutMs ?? TIMEOUT_MS;
  }

  /**
   * @param address The address of the page.
   * @throws {Error} When the form or its elements are missing, or no new panel appears in time.
   */
  public async add(address: string): Promise<void> {
    const known = new Set(this.#bar.panelIds());
    if (!this.#bar.openForm()) {
      throw new Error('The button that opens the Add web panel form was not found');
    }
    await this.#until(() => this.#bar.fill(address), 'The address field of the Add web panel form was not found');
    await this.#until(() => this.#bar.submit(), 'The submit button of the Add web panel form was not found');
    await this.#until(() => this.#bar.panelIds().some((id) => !known.has(id)), 'Vivaldi did not add the web panel');
  }

  async #until(done: () => boolean, failure: string): Promise<void> {
    for (let waited = 0; waited <= this.#timeoutMs; waited += STEP_MS) {
      if (done()) {
        return;
      }
      await this.#sleep(STEP_MS);
    }
    throw new Error(failure);
  }
}
