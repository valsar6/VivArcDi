const LISTED_TIMEOUT_MS = 3e3;
class MenuCommand {
  parts;
  #busy = false;
  #failed = false;
  /**
   * Base of the commands that drive Vivaldi's workspace menu. They run one at a time, only at a
   * quiet moment, close the menu after each run and, after a failed step, do nothing more until
   * Vivaldi starts again.
   *
   * @param parts Everything the command collaborates with.
   */
  constructor(parts) {
    this.parts = parts;
  }
  async attempt(job, what) {
    if (this.#failed) {
      return "failed";
    }
    if (this.#busy || !this.parts.quiet.now) {
      return "deferred";
    }
    this.#busy = true;
    try {
      await job();
      return "done";
    } catch (error) {
      this.#failed = true;
      this.parts.logger.warn(`${what} through Vivaldi's workspace menu failed: it is not tried again until the next start`, error);
      return "failed";
    } finally {
      this.parts.menu.close();
      this.#busy = false;
    }
  }
  async listed(name) {
    const { names, poll } = this.parts;
    const found = await poll.until(async () => {
      await names.refresh();
      return names.names.includes(name) ? true : null;
    }, LISTED_TIMEOUT_MS);
    if (found === null) {
      throw new Error(`Vivaldi did not list ${name}`);
    }
  }
}
export {
  LISTED_TIMEOUT_MS,
  MenuCommand
};
