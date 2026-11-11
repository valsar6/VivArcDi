const TAB_ENTRIES_TYPE = "vivaldi/x-tab-entries";
class TabEntries {
  /**
   * @param transfer The data of an HTML5 drag, if the event has any.
   * @returns Whether the drag carries tabs of Vivaldi, that is `vivaldi/x-tab-entries`.
   */
  static carriedBy(transfer) {
    return Array.from(transfer?.types ?? []).includes(TAB_ENTRIES_TYPE);
  }
}
export {
  TAB_ENTRIES_TYPE,
  TabEntries
};
