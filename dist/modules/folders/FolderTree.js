import { AddressKey } from "../../core/AddressKey.js";
class FolderTree {
  /**
   * Turns the children of the root folder into the tree the section shows. Separators, links that
   * are not `http` or `https` pages and folders nested deeper than `maxDepth` levels are left out;
   * the order is Vivaldi's.
   *
   * @param nodes The children of the root folder.
   * @param maxDepth How many levels of folders are shown.
   * @returns Folders and links.
   */
  static build(nodes, maxDepth) {
    return FolderTree.#entries(nodes, 0, maxDepth);
  }
  /**
   * @param entries A tree.
   * @returns Every link in it, at any depth, in display order.
   */
  static links(entries) {
    return entries.flatMap((entry) => entry.kind === "link" ? [entry] : FolderTree.links(entry.children));
  }
  static #entries(nodes, depth, maxDepth) {
    return nodes.flatMap((node) => {
      if (node.separator === true) {
        return [];
      }
      if (node.children !== void 0) {
        return depth < maxDepth ? [{ kind: "folder", id: node.id, title: node.title, depth, children: FolderTree.#entries(node.children, depth + 1, maxDepth) }] : [];
      }
      const key = AddressKey.from(node.url);
      return node.url === void 0 || key === null ? [] : [{ kind: "link", id: node.id, title: node.title, url: node.url, key, depth }];
    });
  }
}
export {
  FolderTree
};
