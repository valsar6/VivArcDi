import type { Logger } from '../support/Logger.js';
import type { WebviewElement } from './Webview.js';

export const TAB_CLOSED_ERROR = 'The tab was closed.';

export interface LastErrorSource {
  /** The message of `chrome.runtime.lastError`, read inside an API callback, or null. */
  readonly lastError: string | null;
}

export class ScriptRunner {
  #purpose: string;
  #errors: LastErrorSource;
  #logger: Logger;
  #warned = false;

  /**
   * Runs scripts in webviews and reports the ones that did not run.
   *
   * @param purpose What the scripts are for, in plain words, used in the log lines.
   * @param errors Reads `chrome.runtime.lastError` inside the callback of each injection.
   * @param logger Receives one warning per runner and a debug line for each page that went away.
   */
  constructor(purpose: string, errors: LastErrorSource, logger: Logger) {
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
  public run(webview: WebviewElement, code: string): void {
    try {
      webview.executeScript({ code }, () => this.#report(webview));
    } catch (error) {
      this.#warnOnce(`Cannot inject into pages: ${this.#purpose} are off`, error);
    }
  }

  #report(webview: WebviewElement): void {
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

  #warnOnce(...message: unknown[]): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn(...message);
    }
  }
}
