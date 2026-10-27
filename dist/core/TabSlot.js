const TAB_ID = /^tab-(\d+)$/;
class TabSlot {
  /**
   * Reads the tab id of a slot of Vivaldi's tab strip, or of an element inside one.
   *
   * @param slot A slot, a tab wrapper, or an element inside a slot.
   * @param wrapperSelector Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`.
   * @returns The tab id, or null.
   */
  static idOf(slot, wrapperSelector) {
    const wrapper = slot.closest(wrapperSelector) ?? slot.querySelector(wrapperSelector);
    const match = TAB_ID.exec(wrapper?.dataset["id"] ?? "");
    return match?.[1] === void 0 ? null : Number(match[1]);
  }
}
export {
  TabSlot
};
