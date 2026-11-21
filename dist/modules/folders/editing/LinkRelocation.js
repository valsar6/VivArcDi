import { TabData } from "../../../core/tabs/TabData.js";
const MOVE_TO_LABEL = "Move to";
const NEW_SPACE_LABEL = "New Space\u2026";
const MOVED_TEXT = "Tab moved! Click to go there.";
class LinkRelocation {
  #deps;
  /**
   * Moves a saved tab (a bookmarked link) to another workspace: the bookmark goes to the end of
   * that workspace's root and only the open tab of the row gets the workspace. A toast then lets
   * the user follow it. When the bookmark cannot move, nothing changes and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param linkId The bookmark id of the link.
   * @returns `Move to` with one command per workspace, the current one checked, then `New Space…`; null when Vivaldi lists no workspace.
   */
  submenu(linkId) {
    const { names, active } = this.#deps;
    if (names.entries.length === 0) {
      return null;
    }
    const spaces = names.entries.map((entry) => {
      const checked = entry.id === active.current;
      return { label: entry.name, checked, run: () => checked ? void 0 : void this.move(linkId, entry) };
    });
    const create = { label: NEW_SPACE_LABEL, run: () => void this.moveToNewSpace(linkId) };
    return { label: MOVE_TO_LABEL, items: [...spaces, { separator: true }, create] };
  }
  /**
   * @param linkId The bookmark id of the link.
   * @param workspace The workspace that receives it.
   */
  async move(linkId, workspace) {
    const { hold, toast, writer, linkedTab } = this.#deps;
    let name = linkId;
    try {
      name = (await writer.subTree(linkId)).title;
      const targetRootId = await writer.ensurePath(this.#deps.roots.rootFor(workspace.name));
      if (targetRootId === await this.#currentRootId()) {
        toast.show(`"${name}" is already there`);
        return;
      }
      const tabId = (await linkedTab.of(linkId))?.id;
      hold.add([linkId]);
      await writer.move(linkId, { parentId: targetRootId });
      await this.#send(tabId, workspace.id);
      this.#announce(name, workspace, tabId);
    } catch (error) {
      this.#deps.logger.warn("could not move the saved tab", error);
      toast.show(`Could not move "${name}"`, "error");
    } finally {
      hold.clear([linkId]);
    }
  }
  /**
   * Asks for a name, creates the workspace and moves the saved tab into it. An empty name or
   * Escape creates nothing.
   *
   * @param linkId The bookmark id of the link.
   */
  async moveToNewSpace(linkId) {
    const { dialog, creator, names, toast } = this.#deps;
    const name = await dialog.ask({
      title: "New Space",
      label: "Name",
      value: "",
      confirm: "Create",
      validate: (value) => this.#refusal(value)
    });
    if (name === null || name === "") {
      return;
    }
    const result = await creator.create(name);
    const id = result === "done" ? names.idOf(name) : null;
    const created = names.entries.find((entry) => entry.id === id);
    if (created === void 0) {
      toast.show("Could not create the space", "error");
      return;
    }
    await this.move(linkId, created);
  }
  /**
   * Removes the toast from the window.
   */
  dispose() {
    this.#deps.toast.remove();
  }
  #refusal(value) {
    if (value === "") {
      return "Enter a name";
    }
    return this.#deps.names.names.includes(value) ? "A space with that name already exists" : null;
  }
  #announce(name, workspace, tabId) {
    const { toast, switcher } = this.#deps;
    if (tabId === void 0) {
      toast.show(`Moved "${name}" to ${workspace.name}`);
      return;
    }
    toast.show(MOVED_TEXT, "ok", () => void switcher.to(tabId));
  }
  async #currentRootId() {
    const { names, active, roots, writer } = this.#deps;
    const current = names.entries.find((entry) => entry.id === active.current)?.name ?? null;
    const path = roots.rootFor(current);
    return path.length === 0 ? null : writer.ensurePath(path);
  }
  async #send(tabId, workspaceId) {
    if (tabId === void 0) {
      return;
    }
    try {
      await this.#deps.tabData.write(tabId, (tab) => TabData.withWorkspace(TabData.dataOf(tab), workspaceId));
    } catch (error) {
      this.#deps.logger.warn("could not move the tab of the saved tab", error);
    }
  }
}
export {
  LinkRelocation,
  MOVED_TEXT,
  MOVE_TO_LABEL,
  NEW_SPACE_LABEL
};
