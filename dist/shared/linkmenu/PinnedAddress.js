const PROTOCOLS = ["http:", "https:", "file:", "vivaldi:"];
const INVALID_TEXT = "Enter a valid address";
const FAILED_TEXT = "Could not change the address";
const DIALOG_TEXT = "This is what opens first when you click this tab or its favicon.";
class PinnedAddress {
  #deps;
  /**
   * The `Edit Pinned Page` submenu of a saved link: it saves the address of the open tab as the
   * address the link opens first, or a typed one. The name and icon are never written.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param linkId The bookmark id of the link row.
   * @returns `Edit Pinned Page ▸` with `Replace Pinned URL with Current`, disabled when the row has
   * no open tab or the tab already has the saved address, and `Edit…`.
   */
  async submenu(linkId) {
    const [tab, saved] = await Promise.all([this.#deps.linkedTab.of(linkId), this.#savedUrl(linkId)]);
    const current = tab?.url;
    const replace = {
      label: "Replace Pinned URL with Current",
      disabled: current === void 0 || PinnedAddress.#same(current, saved),
      run: () => void this.#write(linkId, current)
    };
    return { label: "Edit Pinned Page", items: [replace, { label: "Edit\u2026", run: () => void this.#edit(linkId) }] };
  }
  async #edit(linkId) {
    try {
      const value = await this.#deps.dialog.ask({
        title: "Edit Pinned URL",
        text: DIALOG_TEXT,
        label: "URL",
        value: await this.#savedUrl(linkId) ?? "",
        confirm: "Save",
        validate: (text) => PinnedAddress.#valid(text) ? null : INVALID_TEXT
      });
      if (value !== null) {
        await this.#write(linkId, value);
      }
    } catch (error) {
      this.#fail(error);
    }
  }
  async #write(linkId, url) {
    if (url === void 0) {
      return;
    }
    try {
      await this.#deps.writer.setUrl(linkId, url);
    } catch (error) {
      this.#fail(error);
    }
  }
  async #savedUrl(linkId) {
    try {
      return (await this.#deps.writer.get(linkId)).url;
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
