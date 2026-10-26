class Workspace {
  /**
   * Reads the workspace a tab belongs to from Vivaldi's `vivExtData`.
   *
   * @param tab A tab.
   * @returns The workspace id, or null for a tab outside any workspace.
   */
  static of(tab) {
    const id = Workspace.#parse(tab.vivExtData)["workspaceId"];
    return typeof id === "number" || typeof id === "string" ? String(id) : null;
  }
  /**
   * A tab outside any workspace, like a Favorite pinned in every workspace, is shared by all.
   *
   * @param candidate The tab that may be reused.
   * @param newTab The tab the user just opened.
   * @returns Whether the candidate is visible in the new tab's workspace.
   */
  static shares(candidate, newTab) {
    const workspace = Workspace.of(candidate);
    return workspace === null || workspace === Workspace.of(newTab);
  }
  static #parse(data) {
    try {
      const parsed = JSON.parse(data ?? "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
}
export {
  Workspace
};
