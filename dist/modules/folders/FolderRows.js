import { FolderTree } from "./FolderTree.js";
class FolderRows {
  /**
   * Decides which rows the section shows. An open folder shows its children. A closed folder shows
   * none of them, except the links that have an open tab, which stay below it, one level in, so
   * that what is in use is always visible. A link whose tab shows another page of the web takes
   * that page's title.
   *
   * @param entries The tree of folders and links.
   * @param sources Which folders are open and which links have a tab.
   * @returns The rows, top to bottom.
   */
  static build(entries, sources) {
    return entries.flatMap((entry) => entry.kind === "link" ? [FolderRows.#link(entry, entry.depth, sources)] : FolderRows.#folder(entry, sources));
  }
  static #folder(folder, sources) {
    const open = sources.isOpen(folder.id);
    const own = { kind: "folder", id: folder.id, title: folder.title, depth: folder.depth, open };
    if (open) {
      return [own, ...FolderRows.build(folder.children, sources)];
    }
    const staying = FolderTree.links(folder.children).filter((link) => sources.tabFor(link) !== void 0);
    return [own, ...staying.map((link) => FolderRows.#link(link, folder.depth + 1, sources))];
  }
  static #link(link, depth, sources) {
    const tab = sources.tabFor(link);
    const otherTitle = tab !== void 0 && tab.key !== link.key ? tab.title : void 0;
    return { kind: "link", id: link.id, title: otherTitle !== void 0 && otherTitle !== "" ? otherTitle : link.title, url: link.url, key: link.key, depth, tab };
  }
}
export {
  FolderRows
};
