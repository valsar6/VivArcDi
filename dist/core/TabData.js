const OWN_KEY = "vivarcdi";
const STACK_KEY = "group";
class TabData {
  /**
   * Reads the workspace a tab belongs to from Vivaldi's `vivExtData`.
   *
   * @param tab A tab.
   * @returns The workspace id, or null for a tab outside any workspace.
   */
  static of(tab) {
    const id = TabData.#parse(tab.vivExtData)["workspaceId"];
    return typeof id === "number" || typeof id === "string" ? String(id) : null;
  }
  /**
   * Reads the tab stack a tab belongs to from Vivaldi's `vivExtData`. The key is still to be
   * confirmed on Vivaldi 8.2, so it is read here and nowhere else.
   *
   * @param tab A tab.
   * @returns The stack id, or null for a tab outside any stack.
   */
  static stackOf(tab) {
    const id = TabData.extDataOf(tab)[STACK_KEY];
    return typeof id === "string" && id !== "" || typeof id === "number" ? String(id) : null;
  }
  /**
   * A tab outside any workspace, like a Favorite pinned in every workspace, is shared by all.
   *
   * @param candidate The tab that may be reused.
   * @param newTab The tab the user just opened.
   * @returns Whether the candidate is visible in the new tab's workspace.
   */
  static shares(candidate, newTab) {
    const workspace = TabData.of(candidate);
    return workspace === null || workspace === TabData.of(newTab);
  }
  /**
   * Adds a workspace to a tab's `vivExtData`, keeping every other field Vivaldi stored there.
   *
   * @param data The current `vivExtData` text, if any.
   * @param workspace The workspace id to write.
   * @returns The new `vivExtData` text.
   */
  static withWorkspace(data, workspace) {
    return JSON.stringify({ ...TabData.#parse(data), workspaceId: Number.isNaN(Number(workspace)) ? workspace : Number(workspace) });
  }
  /**
   * @param tab A tab.
   * @returns Its `vivExtData` text, if Vivaldi gave one.
   */
  static dataOf(tab) {
    return tab.vivExtData;
  }
  /**
   * @param tab A tab.
   * @returns Its whole `vivExtData`, parsed; empty when missing or malformed.
   */
  static extDataOf(tab) {
    return TabData.#parse(tab.vivExtData);
  }
  /**
   * @param tab A tab.
   * @returns What VivArcDi stored on the tab under its own key.
   */
  static ownOf(tab) {
    const own = TabData.extDataOf(tab)[OWN_KEY];
    if (typeof own !== "object" || own === null) {
      return {};
    }
    const { favoriteId, pinnedUrl, lastActive } = own;
    return {
      ...typeof favoriteId === "string" ? { favoriteId } : {},
      ...typeof pinnedUrl === "string" ? { pinnedUrl } : {},
      ...typeof lastActive === "number" && Number.isFinite(lastActive) ? { lastActive } : {}
    };
  }
  /**
   * Builds a new `vivExtData` that changes only VivArcDi's own key, keeping Vivaldi's keys as they are.
   *
   * @param tab The tab as just read.
   * @param changes Values to set; `undefined` removes a value. The key goes away when it ends up empty.
   * @param extra Other top-level keys to set, such as `workspaceId`.
   * @returns The `vivExtData` text to write.
   */
  static withOwn(tab, changes, extra = {}) {
    const data = TabData.extDataOf(tab);
    delete data[OWN_KEY];
    const own = { ...TabData.ownOf(tab) };
    for (const [key, value] of Object.entries(changes)) {
      if (value === void 0) {
        delete own[key];
      } else {
        own[key] = value;
      }
    }
    return JSON.stringify({ ...data, ...extra, ...Object.keys(own).length > 0 ? { [OWN_KEY]: own } : {} });
  }
  /**
   * Builds a new `vivExtData` with one of Vivaldi's own keys set, keeping all the others.
   *
   * @param tab The tab as just read.
   * @param key The key to set, such as `tiling`.
   * @param value Its value.
   * @returns The `vivExtData` text to write.
   */
  static with(tab, key, value) {
    return JSON.stringify({ ...TabData.extDataOf(tab), [key]: value });
  }
  static #parse(data) {
    try {
      const parsed = JSON.parse(data ?? "{}");
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}
export {
  TabData
};
