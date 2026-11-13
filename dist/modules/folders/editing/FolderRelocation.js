import { TabData } from "../../../core/tabs/TabData.js";
const MOVE_TO_LABEL = "Move to";
class FolderRelocation {
  #deps;
  /**
   * Moves a bookmark folder to another workspace: the folder goes to the end of that workspace's
   * root, and only after that the open tabs of its links get the workspace, so they show under the
   * folder there. When the bookmark cannot move, nothing changes and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param folderId The bookmark id of the folder.
   * @returns The `Move to` item with one command per workspace, the current one checked; null when Vivaldi lists no workspace.
   */
  submenu(folderId) {
    const { names, active } = this.#deps;
    const entries = names.entries;
    if (entries.length === 0) {
      return null;
    }
    return {
      label: MOVE_TO_LABEL,
      items: entries.map((entry) => {
        const checked = entry.id === active.current;
        return { label: entry.name, checked, run: () => checked ? void 0 : void this.move(folderId, entry) };
      })
    };
  }
  /**
   * @param folderId The bookmark id of the folder.
   * @param workspace The workspace that receives it.
   */
  async move(folderId, workspace) {
    const { closing, notify, writer, linkTabs } = this.#deps;
    let name = folderId;
    let linkIds = [];
    try {
      const folder = await writer.subTree(folderId);
      name = folder.title;
      const targetRootId = await writer.ensurePath(this.#deps.roots.rootFor(workspace.name));
      if (targetRootId === await this.#currentRootId()) {
        notify(`"${name}" is already there`);
        return;
      }
      linkIds = linkTabs.linkIds(folder);
      const tabIds = await linkTabs.tabsOf(linkIds);
      closing.add(linkIds);
      await writer.move(folderId, { parentId: targetRootId });
      this.#deps.openFolders.forget(folderId);
      await this.#send(tabIds, workspace.id);
      notify(`Moved "${name}" to ${workspace.name}`);
    } catch (error) {
      this.#deps.logger.warn("could not move the folder", error);
      notify(`Could not move "${name}"`, "error");
    } finally {
      closing.clear(linkIds);
    }
  }
  async #currentRootId() {
    const { names, active, roots, writer } = this.#deps;
    const current = names.entries.find((entry) => entry.id === active.current)?.name ?? null;
    const path = roots.rootFor(current);
    return path.length === 0 ? null : writer.ensurePath(path);
  }
  async #send(tabIds, workspaceId) {
    for (const tabId of tabIds) {
      try {
        await this.#deps.tabData.write(tabId, (tab) => TabData.withWorkspace(TabData.dataOf(tab), workspaceId));
      } catch (error) {
        this.#deps.logger.warn("could not move a tab of the moved folder", error);
      }
    }
  }
}
export {
  FolderRelocation,
  MOVE_TO_LABEL
};
