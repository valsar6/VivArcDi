const DEFAULT_TIMEOUT_MS = 15000;

export class UiReadiness {
  #document: Document;
  #timeoutMs: number;

  /**
   * Waits for parts of Vivaldi's interface, which is built after `window.html` loads.
   *
   * @param document The document of Vivaldi's browser window.
   * @param timeoutMs How long to wait before giving up.
   */
  constructor(document: Document, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.#document = document;
    this.#timeoutMs = timeoutMs;
  }

  /**
   * Resolves with the first element matching a selector, as soon as it exists.
   *
   * @param selector CSS selector to wait for.
   * @returns The matching element.
   * @throws {Error} When nothing matches before the timeout.
   */
  public waitFor(selector: string): Promise<Element> {
    const existing = this.#document.querySelector(selector);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise<Element>((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const element = this.#document.querySelector(selector);
        if (element) {
          finish();
          resolve(element);
        }
      });
      const timer = setTimeout(() => {
        finish();
        reject(new Error(`Timed out waiting for ${selector}`));
      }, this.#timeoutMs);
      const finish = (): void => {
        observer.disconnect();
        clearTimeout(timer);
      };
      observer.observe(this.#document.documentElement, { childList: true, subtree: true });
    });
  }
}
