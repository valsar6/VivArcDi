import type { DropTarget } from './DropTargets.js';
import type { AddPlace } from '../favoritelinks/WorkspaceFavorites.js';

export class DropPlace {
  #indexBefore: (bookmarkId: string | null) => number | undefined;

  /**
   * Turns a drop target of the folders section into the place where a new bookmark goes: the end
   * of a folder, the position before a row of the root, or the end of the root for the header.
   *
   * @param indexBefore Gives the index among the children of the root before which a bookmark goes; undefined for the end.
   */
  constructor(indexBefore: (bookmarkId: string | null) => number | undefined) {
    this.#indexBefore = indexBefore;
  }

  /**
   * @param target What was under the pointer.
   * @returns The folder and the index for the new bookmark; empty for the end of the root.
   */
  public of(target: DropTarget): AddPlace {
    if (target.kind === 'folder') {
      return { parentId: target.id };
    }
    return target.kind === 'between' ? { index: this.#indexBefore(target.before) } : {};
  }
}
