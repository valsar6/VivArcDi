const STEP_MS = 50;
const TIMEOUT_MS = 3e3;
class WebPanelForm {
  #bar;
  #sleep;
  #timeoutMs;
  /**
   * Adds a web panel through Vivaldi's own form: opens it, types the address, submits it and waits
   * for the new panel's button. Vivaldi then creates the panel, reads its title and icon from the
   * page and opens the side panel.
   *
   * @param dependencies The panel bar, and optionally the wait and its limit.
   */
  constructor({ bar, sleep, timeoutMs }) {
    this.#bar = bar;
    this.#sleep = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#timeoutMs = timeoutMs ?? TIMEOUT_MS;
  }
  /**
   * @param address The address of the page.
   * @throws {Error} When the form or its elements are missing, or no new panel appears in time.
   */
  async add(address) {
    const known = new Set(this.#bar.panelIds());
    if (!this.#bar.openForm()) {
      throw new Error("The button that opens the Add web panel form was not found");
    }
    await this.#until(() => this.#bar.fill(address), "The address field of the Add web panel form was not found");
    await this.#until(() => this.#bar.submit(), "The submit button of the Add web panel form was not found");
    await this.#until(() => this.#bar.panelIds().some((id) => !known.has(id)), "Vivaldi did not add the web panel");
  }
  async #until(done, failure) {
    for (let waited = 0; waited <= this.#timeoutMs; waited += STEP_MS) {
      if (done()) {
        return;
      }
      await this.#sleep(STEP_MS);
    }
    throw new Error(failure);
  }
}
export {
  WebPanelForm
};
