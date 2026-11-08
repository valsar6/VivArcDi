class BookmarkCopier {
  #writer;
  /**
   * Copies bookmarks and bookmark folders into another folder. The originals are only read. A
   * folder is copied with all its levels, in order, and its separators are left out. When a write
   * fails, the copies already made are removed, so no half-made folder stays.
   *
   * @param writer Reads, creates and removes the bookmarks.
   */
  constructor(writer) {
    this.#writer = writer;
  }
  /**
   * @param ids The bookmarks or folders to copy, in the order they get in the target.
   * @param parentId The folder that receives the copies.
   * @param index Position of the first copy among the children of the folder; omitted, the end.
   * @returns The ids of the copies, in order; empty when the target is one of the folders to copy
   * or inside one of them, and nothing was copied.
   */
  async copy(ids, parentId, index) {
    const nodes = [];
    for (const id of ids) {
      nodes.push(await this.#writer.subTree(id));
    }
    if (await this.#isInside(parentId, nodes)) {
      return [];
    }
    const made = [];
    try {
      for (const node of nodes.filter((candidate) => candidate.separator !== true)) {
        const created = await this.#writer.create({ parentId, index: index === void 0 ? void 0 : index + made.length, ...BookmarkCopier.#details(node) });
        made.push(created.id);
        await this.#copyChildren(node, created.id);
      }
    } catch (error) {
      await this.#undo(made);
      throw error;
    }
    return made;
  }
  async #copyChildren(node, parentId) {
    for (const child of (node.children ?? []).filter((candidate) => candidate.separator !== true)) {
      const created = await this.#writer.create({ parentId, ...BookmarkCopier.#details(child) });
      await this.#copyChildren(child, created.id);
    }
  }
  async #isInside(folderId, nodes) {
    const dragged = new Set(nodes.filter((node) => node.children !== void 0).map((node) => node.id));
    let current = folderId;
    while (current !== void 0) {
      if (dragged.has(current)) {
        return true;
      }
      current = (await this.#writer.get(current)).parentId;
    }
    return false;
  }
  async #undo(ids) {
    for (const id of ids) {
      await this.#writer.removeTree(id).catch(() => void 0);
    }
  }
  static #details(node) {
    return node.url === void 0 ? { title: node.title } : { title: node.title, url: node.url };
  }
}
export {
  BookmarkCopier
};
