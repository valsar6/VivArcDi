class LinkMenuItems {
  #actions;
  /**
   * The items of the menu of a link row in Arc's order, in groups split by a separator. An item is
   * listed only from the release that implements it; a group left empty is dropped with its
   * separator.
   *
   * @param actions What the items do.
   */
  constructor(actions) {
    this.#actions = actions;
  }
  /**
   * @param linkId The bookmark id of the link row that was clicked.
   * @returns The items of its menu.
   */
  async for(linkId) {
    return (await this.#groups(linkId)).map((group) => group.filter((item) => item !== null)).filter((group) => group.length > 0).flatMap((group, index) => index === 0 ? group : [{ separator: true }, ...group]);
  }
  async #groups(linkId) {
    const actions = this.#actions;
    const [edit, split] = await Promise.all([actions.editPinnedPage(linkId), actions.openInSplitView(linkId)]);
    return [
      [actions.copyLink(linkId)],
      [edit],
      [split, actions.duplicate(linkId), actions.moveTo(linkId)],
      [actions.removePin(linkId), actions.tileTab(linkId)]
    ];
  }
}
export {
  LinkMenuItems
};
