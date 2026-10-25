export class UiReadiness {
  #document;
  #timeoutMs;

  /**
   * Waits for parts of Vivaldi's interface, which is built after `window.html` loads.
   *
   * @param {Document} document The document of Vivaldi's browser window.
   * @param {number} [timeoutMs=15000] How long to wait before giving up.
   */
  constructor(document, timeoutMs = 15000) {
    this.#document = document;
    this.#timeoutMs = timeoutMs;
  }

  /**
   * Resolves with the first element matching a selector, as soon as it exists.
   *
   * @param {string} selector CSS selector to wait for.
   * @returns {Promise<Element>} The matching element.
   * @throws {Error} When nothing matches before the timeout.
   */
  waitFor(selector) {
    const existing = this.#document.querySelector(selector);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
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
      const finish = () => {
        observer.disconnect();
        clearTimeout(timer);
      };
      observer.observe(this.#document.documentElement, { childList: true, subtree: true });
    });
  }
}
