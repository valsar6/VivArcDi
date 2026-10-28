class BrowserPrefs {
  #prefs;
  /**
   * Read-only access to Vivaldi's preferences, such as the list of workspaces. It is the only
   * place that touches `vivaldi.prefs`; it has no method that writes a preference.
   *
   * @param prefs `window.vivaldi.prefs`, else `chrome.vivaldiPrivate.prefs`, or undefined where neither exists.
   */
  constructor(prefs) {
    this.#prefs = prefs ?? null;
  }
  /**
   * @returns Whether Vivaldi's preferences can be read from this document.
   */
  get available() {
    return this.#prefs !== null;
  }
  /**
   * @returns Whether a change of a preference is announced, so that it need not be read again.
   */
  get canFollow() {
    return this.#prefs?.onChanged !== void 0;
  }
  /**
   * @param key The preference path, such as `vivaldi.workspaces.list`.
   * @returns Its current value.
   * @throws {Error} When the preferences are not available.
   */
  get(key) {
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
  onChange(key, listener) {
    const event = this.#require().onChanged;
    if (event === void 0) {
      throw new Error("vivaldi.prefs.onChanged is not available");
    }
    const forKey = (changed) => {
      if (changed === key) {
        listener();
      }
    };
    event.addListener(forKey);
    return () => event.removeListener(forKey);
  }
  #require() {
    if (this.#prefs === null) {
      throw new Error("vivaldi.prefs is not available");
    }
    return this.#prefs;
  }
}
export {
  BrowserPrefs
};
