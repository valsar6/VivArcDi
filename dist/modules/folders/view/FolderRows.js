import { FolderTree } from "../../../shared/links/FolderTree.js";
class FolderRows {
  /**
   * Decides which rows the section shows. An open folder shows its children. A closed folder shows
   * none of them, except the links that have an open tab, which stay below it, one level in, so
   * that what is in use is always visible. A link whose tab shows another page of the web takes
   * that page's title, and a name the user gave it wins over both. When the space is collapsed, only the links that have an open tab are shown,
   * at the depth they have below a closed folder, and no folder row.
   *
   * @param entries The tree of folders and links.
   * @param sources Which folders are open and which links have a tab.
   * @param collapsed Whether the space is collapsed.
   * @returns The rows, top to bottom.
   */
  static build(entries, sources, collapsed = false) {
    if (collapsed) {
      return FolderRows.#collapsed(entries, sources);
    }
    return entries.flatMap((entry) => entry.kind === "link" ? [FolderRows.#link(entry, entry.depth, sources)] : FolderRows.#folder(entry, sources));
  }
  static #collapsed(entries, sources) {
    return entries.flatMap(
      (entry) => entry.kind === "link" ? sources.tabFor(entry) === void 0 ? [] : [FolderRows.#link(entry, entry.depth, sources)] : FolderRows.#staying(entry, sources)
    );
  }
  static #folder(folder, sources) {
    const open = sources.isOpen(folder.id);
    const own = {
      kind: "folder",
      id: folder.id,
      title: folder.title,
      depth: folder.depth,
      open,
      ...folder.live === void 0 ? {} : { live: folder.live },
      ...folder.warning === void 0 ? {} : { warning: folder.warning }
    };
    if (open) {
      return [own, ...FolderRows.build(folder.children, sources)];
    }
    return [own, ...FolderRows.#staying(folder, sources)];
  }
  static #staying(folder, sources) {
    const open = FolderTree.links(folder.children).filter((link) => sources.tabFor(link) !== void 0);
    return open.map((link) => FolderRows.#link(link, folder.depth + 1, sources));
  }
  static #link(link, depth, sources) {
    const tab = sources.tabFor(link);
    const label = sources.labels?.(link.id);
    return {
      kind: "link",
      id: link.id,
      title: label?.name ?? FolderRows.#shownTitle(link, tab),
      url: link.url,
      key: link.key,
      depth,
      tab,
      ...link.subtitle === void 0 ? {} : { subtitle: link.subtitle },
      ...FolderRows.#looks(label)
    };
  }
  static #looks(label) {
    return { ...label?.icon === void 0 ? {} : { icon: label.icon }, ...label?.favicon === void 0 ? {} : { favicon: label.favicon } };
  }
  static #shownTitle(link, tab) {
    const otherTitle = tab !== void 0 && tab.key !== link.key ? tab.title : void 0;
    return otherTitle !== void 0 && otherTitle !== "" ? otherTitle : link.title;
  }
}
export {
  FolderRows
};
