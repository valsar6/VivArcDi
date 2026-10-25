import type { ChromeApi, ChromeEvent, RuntimeMessageListener } from './BrowserTabs.js';

export class BrowserRuntime {
  #onMessage: ChromeEvent<RuntimeMessageListener> | null;
  #createWindow: ((...args: unknown[]) => void) | null;

  /**
   * Access to `chrome.runtime` messages and `chrome.windows` from Vivaldi's interface.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#onMessage = chromeApi?.runtime?.onMessage ?? null;
    this.#createWindow = chromeApi?.windows?.create ?? null;
  }

  /**
   * @returns Whether messages from injected scripts can be received.
   */
  public get messagesAvailable(): boolean {
    return this.#onMessage !== null;
  }

  /**
   * Listens to messages sent with `chrome.runtime.sendMessage`.
   *
   * @param listener Called with each message.
   * @returns A function that removes the listener.
   * @throws {Error} When `chrome.runtime.onMessage` is missing.
   */
  public onMessage(listener: RuntimeMessageListener): () => void {
    const event = this.#onMessage;
    if (event === null) {
      throw new Error('chrome.runtime.onMessage is not available');
    }
    event.addListener(listener);
    return () => event.removeListener(listener);
  }

  /**
   * Opens a URL in a new browser window.
   *
   * @param url Address to open.
   * @returns Resolves once the window was requested.
   */
  public openWindow(url: string): Promise<void> {
    const create = this.#createWindow;
    if (create === null) {
      return Promise.reject(new Error('chrome.windows is not available'));
    }
    return new Promise((resolve) => create({ url }, () => resolve()));
  }
}
