export type PrefChangeListener = (key: string, value?: unknown) => void;

export interface PrefsApi {
  get: (key: string, callback: (result: { value?: unknown } | undefined) => void) => void;
  onChanged?:
    | {
        addListener(listener: PrefChangeListener): void;
        removeListener(listener: PrefChangeListener): void;
      }
    | undefined;
}

export class BrowserPrefs {
  #prefs: PrefsApi | null;

  /**
   * Read-only access to Vivaldi's preferences, such as the list of workspaces. It is the only
   * place that touches `vivaldi.prefs`; it has no method that writes a preference.
   *
   * @param prefs `window.vivaldi.prefs`, else `chrome.vivaldiPrivate.prefs`, or undefined where neither exists.
   */
  constructor(prefs: PrefsApi | undefined) {
    this.#prefs = prefs ?? null;
  }

  /**
   * @returns Whether Vivaldi's preferences can be read from this document.
   */
  public get available(): boolean {
    return this.#prefs !== null;
  }

  /**
   * @returns Whether a change of a preference is announced, so that it need not be read again.
   */
  public get canFollow(): boolean {
    return this.#prefs?.onChanged !== undefined;
  }

  /**
   * @param key The preference path, such as `vivaldi.workspaces.list`.
   * @returns Its current value.
   * @throws {Error} When the preferences are not available.
   */
  public get(key: string): Promise<unknown> {
    const prefs = this.#require();
    return new Promise((resolve) => prefs.get(key, (result) => resolve(result?.value)));
  }

  /**
   * Listens to the changes of one preference.
   *
   * @param key The preference path.
   * @param listener Called after each change of that preference.
   * @returns A function that removes the listener.
   * @throws {Error} When changes are not announced.
   */
  public onChange(key: string, listener: () => void): () => void {
    const event = this.#require().onChanged;
    if (event === undefined) {
      throw new Error('vivaldi.prefs.onChanged is not available');
    }
    const forKey: PrefChangeListener = (changed) => {
      if (changed === key) {
        listener();
      }
    };
    event.addListener(forKey);
    return () => event.removeListener(forKey);
  }

  #require(): PrefsApi {
    if (this.#prefs === null) {
      throw new Error('vivaldi.prefs is not available');
    }
    return this.#prefs;
  }
}
