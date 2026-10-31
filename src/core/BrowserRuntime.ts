import type { ChromeApi, ChromeEvent, RuntimeMessageListener } from './BrowserTabs.js';

export interface WindowInfo {
  id?: number | undefined;
  incognito?: boolean | undefined;
}

type ChromeWindows = NonNullable<ChromeApi['windows']>;

export class BrowserRuntime {
  #chrome: ChromeApi | undefined;
  #onMessage: ChromeEvent<RuntimeMessageListener> | null;
  #windows: ChromeWindows | null;

  /**
   * Access to `chrome.runtime` messages and `chrome.windows` from Vivaldi's interface.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#chrome = chromeApi;
    this.#onMessage = chromeApi?.runtime?.onMessage ?? null;
    this.#windows = chromeApi?.windows ?? null;
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
    const windows = this.#windows;
    if (windows === null) {
      return Promise.reject(new Error('chrome.windows is not available'));
    }
    return new Promise((resolve) => windows.create({ url }, () => resolve()));
  }

  /**
   * @returns Whether this window is a private window.
   * @throws {Error} When `chrome.windows.getCurrent` is missing or fails.
   */
  public async isPrivateWindow(): Promise<boolean> {
    return (await this.#currentWindow()).incognito === true;
  }

  /**
   * @returns The id of this window, as `chrome.tabs` knows it.
   * @throws {Error} When `chrome.windows.getCurrent` is missing or fails, or gives no id.
   */
  public async currentWindowId(): Promise<number> {
    const { id } = await this.#currentWindow();
    if (id === undefined) {
      throw new Error('The current window has no id');
    }
    return id;
  }

  #currentWindow(): Promise<WindowInfo> {
    const getCurrent = this.#windows?.getCurrent;
    if (getCurrent === undefined) {
      return Promise.reject(new Error('chrome.windows.getCurrent is not available'));
    }
    return new Promise((resolve, reject) => {
      getCurrent.call(this.#windows, (info: WindowInfo | undefined) => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(info ?? {});
        }
      });
    });
  }
}
