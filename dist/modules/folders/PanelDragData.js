const PANEL_BOOKMARKS_TYPE = "vivaldi/x-bookmarks";
class PanelDragData {
  /**
   * @param types The `types` of a drag, known from its first event on.
   * @returns Whether the drag carries bookmarks of the Bookmarks panel.
   */
  static carriesBookmarks(types) {
    return types !== void 0 && Array.from(types).includes(PANEL_BOOKMARKS_TYPE);
  }
  /**
   * Reads the bookmark ids of a drag from the Bookmarks panel; the data can be read only when the
   * item is dropped.
   *
   * @param dataTransfer The data of the drop.
   * @returns The ids in the panel's order; empty when the data is missing, is not JSON or is not a list of strings.
   */
  static ids(dataTransfer) {
    try {
      const parsed = JSON.parse(dataTransfer.getData(PANEL_BOOKMARKS_TYPE));
      return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : [];
    } catch {
      return [];
    }
  }
}
export {
  PANEL_BOOKMARKS_TYPE,
  PanelDragData
};
