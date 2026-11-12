import { LiveEntries } from "./LiveEntries.js";
class LiveFolderPublisher {
  #store;
  #virtual;
  #published = /* @__PURE__ */ new Set();
  /**
   * Puts the live folders of the store where the folders section reads them. Workspaces that lost
   * their last folder are emptied.
   *
   * @param store The stored live folders.
   * @param virtual The state shared with the folders section.
   */
  constructor(store, virtual) {
    this.#store = store;
    this.#virtual = virtual;
  }
  /**
   * Publishes the current folders of every workspace.
   */
  publish() {
    const now = new Set(this.#store.workspaces);
    for (const workspace of /* @__PURE__ */ new Set([...now, ...this.#published])) {
      this.#virtual.set(workspace, this.#store.folders(workspace).map((folder) => LiveEntries.folder(folder)));
    }
    this.#published = now;
  }
  /**
   * Removes every live folder from the section; the store keeps them.
   */
  clear() {
    this.#published.forEach((workspace) => this.#virtual.set(workspace, []));
    this.#published.clear();
  }
}
export {
  LiveFolderPublisher
};
