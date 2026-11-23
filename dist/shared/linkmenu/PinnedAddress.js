const PROTOCOLS = ["http:", "https:", "file:", "vivaldi:"];
const INVALID_TEXT = "Enter a valid address";
const FAILED_TEXT = "Could not change the address";
const DIALOG_TEXT = "This is what opens first when you click this tab or its favicon.";
class PinnedAddress {
  #deps;
  /**
   * The `Edit Pinned Page` submenu of a pinned tab or a saved link: it saves the address of the
   * open tab as the address it opens first, or a typed one. The name and icon are never written.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param id The id of a pinned tab or a saved link.
   * @returns `Edit Pinned Page ▸` with `Replace Pinned URL with Current`, disabled when the row has
   * no open tab or the tab already has the saved address, and `Edit…`.
   */
  async submenu(id) {
    const [tab, saved] = await Promise.all([this.#tab(id), this.#saved(id)]);
    return this.menuFor(id, { saved, current: tab?.url, open: tab !== void 0 });
  }
  /**
   * @param id The id of a pinned tab or a saved link.
   * @param snapshot What the tab shows next to its saved page.
   * @returns The same submenu, built synchronously from the snapshot.
   */
  menuFor(id, snapshot) {
    const current = snapshot.current;
    const replace = {
      label: "Replace Pinned URL with Current",
      disabled: !snapshot.open || current === void 0 || PinnedAddress.#same(current, snapshot.saved),
      run: () => void this.replace(id)
    };
    return { label: "Edit Pinned Page", items: [replace, { label: "Edit\u2026", run: () => void this.edit(id) }] };
  }
  /**
   * Makes the address the tab shows now the page it opens first.
   *
   * @param id The id of a pinned tab or a saved link.
   */
  async replace(id) {
    const tab = await this.#tab(id);
    if (tab?.url !== void 0) {
      await this.#write(id, tab.url);
    }
  }
  /**
   * Asks for an address and saves it as the page the tab opens first.
   *
   * @param id The id of a pinned tab or a saved link.
   */
  async edit(id) {
    try {
      const value = await this.#deps.dialog.ask({
        title: "Edit Pinned URL",
        text: DIALOG_TEXT,
        label: "URL",
        value: await this.#saved(id) ?? "",
        confirm: "Save",
        validate: (text) => PinnedAddress.#valid(text) ? null : INVALID_TEXT
      });
      if (value !== null) {
        await this.#write(id, value);
      }
    } catch (error) {
      this.#fail(error);
    }
  }
  async #tab(id) {
    try {
      return await this.#deps.store.tab(id);
    } catch (error) {
      this.#deps.logger.warn("could not read the pinned address", error);
      return void 0;
    }
  }
  async #write(id, url) {
    try {
      await this.#deps.store.write(id, url);
    } catch (error) {
      this.#fail(error);
    }
  }
  async #saved(id) {
    try {
      return await this.#deps.store.read(id);
    } catch (error) {
      this.#deps.logger.warn("could not read the pinned address", error);
      return void 0;
    }
  }
  #fail(error) {
    this.#deps.logger.warn("could not change the pinned address", error);
    this.#deps.notify(FAILED_TEXT, "error");
  }
  static #valid(text) {
    try {
      return PROTOCOLS.includes(new URL(text).protocol);
    } catch {
      return false;
    }
  }
  static #same(first, second) {
    try {
      return second !== void 0 && new URL(first).href === new URL(second).href;
    } catch {
      return first === second;
    }
  }
}
export {
  PinnedAddress
};
