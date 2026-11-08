import type { BookmarkNode } from './BookmarkNode.js';
import type { BookmarkWriter, NewBookmark } from './BookmarkWriter.js';

export type CopierWriter = Pick<BookmarkWriter, 'create' | 'get' | 'subTree' | 'removeTree'>;

export class BookmarkCopier {
  #writer: CopierWriter;

  /**
   * Copies bookmarks and bookmark folders into another folder. The originals are only read. A
   * folder is copied with all its levels, in order, and its separators are left out. When a write
   * fails, the copies already made are removed, so no half-made folder stays.
   *
   * @param writer Reads, creates and removes the bookmarks.
   */
  constructor(writer: CopierWriter) {
    this.#writer = writer;
  }

  /**
   * @param ids The bookmarks or folders to copy, in the order they get in the target.
   * @param parentId The folder that receives the copies.
   * @param index Position of the first copy among the children of the folder; omitted, the end.
   * @returns The ids of the copies, in order; empty when the target is one of the folders to copy
   * or inside one of them, and nothing was copied.
   */
  public async copy(ids: string[], parentId: string, index?: number): Promise<string[]> {
    const nodes: BookmarkNode[] = [];
    for (const id of ids) {
      nodes.push(await this.#writer.subTree(id));
    }
    if (await this.#isInside(parentId, nodes)) {
      return [];
    }
    const made: string[] = [];
    try {
      for (const node of nodes.filter((candidate) => candidate.separator !== true)) {
        const created = await this.#writer.create({ parentId, index: index === undefined ? undefined : index + made.length, ...BookmarkCopier.#details(node) });
        made.push(created.id);
        await this.#copyChildren(node, created.id);
      }
    } catch (error) {
      await this.#undo(made);
      throw error;
    }
    return made;
  }

  async #copyChildren(node: BookmarkNode, parentId: string): Promise<void> {
    for (const child of (node.children ?? []).filter((candidate) => candidate.separator !== true)) {
      const created = await this.#writer.create({ parentId, ...BookmarkCopier.#details(child) });
      await this.#copyChildren(child, created.id);
    }
  }

  async #isInside(folderId: string, nodes: BookmarkNode[]): Promise<boolean> {
    const dragged = new Set(nodes.filter((node) => node.children !== undefined).map((node) => node.id));
    let current: string | undefined = folderId;
    while (current !== undefined) {
      if (dragged.has(current)) {
        return true;
      }
      current = (await this.#writer.get(current)).parentId;
    }
    return false;
  }

  async #undo(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.#writer.removeTree(id).catch(() => undefined);
    }
  }

  static #details(node: BookmarkNode): Pick<NewBookmark, 'title' | 'url'> {
    return node.url === undefined ? { title: node.title } : { title: node.title, url: node.url };
  }
}
