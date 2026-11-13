const TAB_ID = /^tab-(\d+)$/;

export class TabSlot {
  /**
   * Reads the tab id of a slot of Vivaldi's tab strip, or of an element inside one.
   *
   * @param slot A slot, a tab wrapper, or an element inside a slot.
   * @param wrapperSelector Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`.
   * @returns The tab id, or null.
   */
  public static idOf(slot: Element, wrapperSelector: string): number | null {
    const wrapper = slot.closest<HTMLElement>(wrapperSelector) ?? slot.querySelector<HTMLElement>(wrapperSelector);
    const match = TAB_ID.exec(wrapper?.dataset['id'] ?? '');
    return match?.[1] === undefined ? null : Number(match[1]);
  }
}
