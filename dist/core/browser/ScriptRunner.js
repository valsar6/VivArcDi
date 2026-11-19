const TAB_CLOSED_ERROR = "The tab was closed.";
class ScriptRunner {
  #purpose;
  #errors;
  #logger;
  #warned = false;
  /**
   * Runs scripts in webviews and reports the ones that did not run.
   *
   * @param purpose What the scripts are for, in plain words, used in the log lines.
   * @param errors Reads `chrome.runtime.lastError` inside the callback of each injection.
   * @param logger Receives one warning per runner and a debug line for each page that went away.
   */
  constructor(purpose, errors, logger) {
    this.#purpose = purpose;
    this.#errors = errors;
    this.#logger = logger;
  }
  /**
   * Runs code in the page of a webview. Never throws.
   *
   * @param webview The webview whose page runs the code.
   * @param code The code to run.
   */
  run(webview, code) {
    try {
      webview.executeScript({ code }, () => this.#report(webview));
    } catch (error) {
      this.#warnOnce(`Cannot inject into pages: ${this.#purpose} are off`, error);
    }
  }
  #report(webview) {
    const message = this.#errors.lastError ?? null;
    if (message === null) {
      return;
    }
    if (message === TAB_CLOSED_ERROR || !webview.isConnected) {
      this.#logger.debug(`${this.#purpose}: the page went away before the script ran (${message})`);
      return;
    }
    this.#warnOnce(`${this.#purpose} could not run in a page: ${message}`);
  }
  #warnOnce(...message) {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn(...message);
    }
  }
}
export {
  ScriptRunner,
  TAB_CLOSED_ERROR
};
