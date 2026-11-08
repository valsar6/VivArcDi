import type { ChromeApi } from './BrowserTabs.js';

export interface WindowDetails {
  id?: number | undefined;
  type?: string | undefined;
}

export interface NewWindow {
  url?: string;
  tabId?: number;
  type?: 'popup' | 'normal';
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  focused?: boolean;
}

type ChromeWindows = NonNullable<ChromeApi['windows']>;

export class BrowserWindows {
  #chrome: ChromeApi | undefined;
  #windows: ChromeWindows | null;

  /**
   * Promise-based access to `chrome.windows`, with the parts Little Arc needs.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#chrome = chromeApi;
    this.#windows = chromeApi?.windows ?? null;
  }

  /**
   * @returns Whether `chrome.windows` exists in this document.
   */
  public get available(): boolean {
    return this.#windows !== null;
  }

  /**
   * Creates a window, or moves an existing tab into a new one when `tabId` is given.
   *
   * @param properties As accepted by `chrome.windows.create`.
   * @returns The new window.
   */
  public create(properties: NewWindow): Promise<WindowDetails> {
    return this.#call('create', properties);
  }

  /**
   * @returns The window this document belongs to.
   */
  public current(): Promise<WindowDetails> {
    return this.#call('getCurrent');
  }

  /**
   * @param types The window types to consider, such as `['normal']`.
   * @returns The window that had the focus last among those types.
   */
  public lastFocused(types: string[]): Promise<WindowDetails> {
    return this.#call('getLastFocused', { windowTypes: types });
  }

  /**
   * Closes a window with all its tabs.
   *
   * @param windowId Window id.
   */
  public async remove(windowId: number): Promise<void> {
    await this.#call('remove', windowId);
  }

  /**
   * Listens to focus changes; the id is -1 when no window of the browser has the focus.
   *
   * @param listener Called with the id of the window that got the focus.
   * @returns A function that removes the listener.
   * @throws {Error} When `chrome.windows.onFocusChanged` is missing.
   */
  public onFocusChanged(listener: (windowId: number) => void): () => void {
    const event = this.#windows?.onFocusChanged;
    if (event === undefined) {
      throw new Error('chrome.windows.onFocusChanged is not available');
    }
    event.addListener(listener);
    return () => event.removeListener(listener);
  }

  #call<T>(method: 'create' | 'getCurrent' | 'getLastFocused' | 'remove', ...args: unknown[]): Promise<T> {
    const windows = this.#windows;
    const call = windows?.[method];
    if (windows === null || call === undefined) {
      return Promise.reject(new Error(`chrome.windows.${method} is not available`));
    }
    return new Promise<T>((resolve, reject) => {
      call.call(windows, ...args, (result: T) => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(result);
        }
      });
    });
  }
}
