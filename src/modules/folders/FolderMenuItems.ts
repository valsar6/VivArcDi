import type { MenuItem, SubmenuItem } from '../../core/ContextMenu.js';

export const RENAME_LABEL = 'Rename…';
export const DUPLICATE_LABEL = 'Duplicate';
export const DELETE_LABEL = 'Delete';

export interface FolderActions {
  /** Starts editing the name of a folder row. */
  rename: (folderId: string) => void;
  /** Adds a closed copy of a folder right below it. */
  duplicate: (folderId: string) => void;
  /** The `Move to` submenu of a folder; null when there is no workspace to move to. */
  moveTo: (folderId: string) => SubmenuItem | null;
  /** Moves a folder to the Trash and closes the tabs of its links. */
  remove: (folderId: string) => void;
}

export class FolderMenuItems {
  #actions: FolderActions;

  /**
   * The items of the folder menu in Arc's order, in groups split by a separator. An item is
   * listed only from the release that implements it; a group left empty is dropped with its
   * separator.
   *
   * @param actions What the items do.
   */
  constructor(actions: FolderActions) {
    this.#actions = actions;
  }

  /**
   * @param folderId The bookmark id of the folder that was clicked.
   * @returns The items of its menu.
   */
  public for(folderId: string): MenuItem[] {
    return this.#groups(folderId)
      .filter((group) => group.length > 0)
      .flatMap((group, index): MenuItem[] => (index === 0 ? group : [{ separator: true }, ...group]));
  }

  #groups(folderId: string): MenuItem[][] {
    const moveTo = this.#actions.moveTo(folderId);
    return [
      [{ label: RENAME_LABEL, run: (): void => this.#actions.rename(folderId) }],
      [{ label: DUPLICATE_LABEL, run: (): void => this.#actions.duplicate(folderId) }, ...(moveTo === null ? [] : [moveTo])],
      [{ label: DELETE_LABEL, run: (): void => this.#actions.remove(folderId) }],
    ];
  }
}
