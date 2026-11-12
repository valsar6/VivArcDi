import type { BookmarkNode } from '../../../core/bookmarks/BookmarkNode.js';

export interface BookmarkTrashSource {
  /** Gives the whole bookmark tree. */
  tree: () => Promise<BookmarkNode[]>;
}

export class BookmarkTrash {
  #source: BookmarkTrashSource;
  #id: string | null = null;

  /**
   * Finds Vivaldi's bookmark Trash: the top-level node whose `trash` flag is true. The id is read
   * once and kept for the session.
   *
   * @param source Where the bookmark tree comes from.
   */
  constructor(source: BookmarkTrashSource) {
    this.#source = source;
  }

  /**
   * @returns The id of the Trash, or null when the tree has none.
   */
  public async id(): Promise<string | null> {
    if (this.#id === null) {
      const top = (await this.#source.tree()).flatMap((root) => root.children ?? []);
      this.#id = top.find((node) => node.trash === true)?.id ?? null;
    }
    return this.#id;
  }
}
