import type { MenuItem } from '../../../core/dom/ContextMenu.js';

export interface LinkActions {
  /** Each member that can be null is null where the command is not available: the item is left out. */
  copyLink: (linkId: string) => MenuItem | null;
  editPinnedPage: (linkId: string) => Promise<MenuItem | null>;
  openInSplitView: (linkId: string) => Promise<MenuItem | null>;
  duplicate: (linkId: string) => MenuItem | null;
  moveTo: (linkId: string) => MenuItem | null;
  removePin: (linkId: string) => MenuItem;
  tileTab: (linkId: string) => MenuItem;
}

export class LinkMenuItems {
  #actions: LinkActions;

  /**
   * The items of the menu of a link row in Arc's order, in groups split by a separator. An item is
   * listed only from the release that implements it; a group left empty is dropped with its
   * separator.
   *
   * @param actions What the items do.
   */
  constructor(actions: LinkActions) {
    this.#actions = actions;
  }

  /**
   * @param linkId The bookmark id of the link row that was clicked.
   * @returns The items of its menu.
   */
  public async for(linkId: string): Promise<MenuItem[]> {
    return (await this.#groups(linkId))
      .map((group) => group.filter((item): item is MenuItem => item !== null))
      .filter((group) => group.length > 0)
      .flatMap((group, index): MenuItem[] => (index === 0 ? group : [{ separator: true }, ...group]));
  }

  async #groups(linkId: string): Promise<Array<Array<MenuItem | null>>> {
    const actions = this.#actions;
    const [edit, split] = await Promise.all([actions.editPinnedPage(linkId), actions.openInSplitView(linkId)]);
    return [
      [actions.copyLink(linkId)],
      [edit],
      [split, actions.duplicate(linkId), actions.moveTo(linkId)],
      [actions.removePin(linkId), actions.tileTab(linkId)],
    ];
  }
}
