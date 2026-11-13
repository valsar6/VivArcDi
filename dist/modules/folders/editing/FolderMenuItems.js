const RENAME_LABEL = "Rename\u2026";
const DUPLICATE_LABEL = "Duplicate";
const DELETE_LABEL = "Delete";
class FolderMenuItems {
  #actions;
  /**
   * The items of the folder menu in Arc's order, in groups split by a separator. An item is
   * listed only from the release that implements it; a group left empty is dropped with its
   * separator.
   *
   * @param actions What the items do.
   */
  constructor(actions) {
    this.#actions = actions;
  }
  /**
   * @param folderId The bookmark id of the folder that was clicked.
   * @returns The items of its menu.
   */
  for(folderId) {
    return this.#groups(folderId).filter((group) => group.length > 0).flatMap((group, index) => index === 0 ? group : [{ separator: true }, ...group]);
  }
  #groups(folderId) {
    const moveTo = this.#actions.moveTo(folderId);
    return [
      [{ label: RENAME_LABEL, run: () => this.#actions.rename(folderId) }],
      [{ label: DUPLICATE_LABEL, run: () => this.#actions.duplicate(folderId) }, ...moveTo === null ? [] : [moveTo]],
      [{ label: DELETE_LABEL, run: () => this.#actions.remove(folderId) }]
    ];
  }
}
export {
  DELETE_LABEL,
  DUPLICATE_LABEL,
  FolderMenuItems,
  RENAME_LABEL
};
