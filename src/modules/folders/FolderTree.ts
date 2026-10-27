import { AddressKey } from '../../core/AddressKey.js';
import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';

export interface FolderEntry {
  kind: 'folder';
  id: string;
  title: string;
  /** Nesting level, 0 for the children of the root. */
  depth: number;
  children: TreeEntry[];
}

export interface LinkEntry {
  kind: 'link';
  id: string;
  title: string;
  url: string;
  /** Address key used to match the link with a tab. */
  key: string;
  depth: number;
}

export type TreeEntry = FolderEntry | LinkEntry;

export class FolderTree {
  /**
   * Turns the children of the root folder into the tree the section shows. Separators, links that
   * are not `http` or `https` pages and folders nested deeper than `maxDepth` levels are left out;
   * the order is Vivaldi's.
   *
   * @param nodes The children of the root folder.
   * @param maxDepth How many levels of folders are shown.
   * @returns Folders and links.
   */
  public static build(nodes: BookmarkNode[], maxDepth: number): TreeEntry[] {
    return FolderTree.#entries(nodes, 0, maxDepth);
  }

  /**
   * @param entries A tree.
   * @returns Every link in it, at any depth, in display order.
   */
  public static links(entries: TreeEntry[]): LinkEntry[] {
    return entries.flatMap((entry) => (entry.kind === 'link' ? [entry] : FolderTree.links(entry.children)));
  }

  static #entries(nodes: BookmarkNode[], depth: number, maxDepth: number): TreeEntry[] {
    return nodes.flatMap((node): TreeEntry[] => {
      if (node.separator === true) {
        return [];
      }
      if (node.children !== undefined) {
        return depth < maxDepth
          ? [{ kind: 'folder', id: node.id, title: node.title, depth, children: FolderTree.#entries(node.children, depth + 1, maxDepth) }]
          : [];
      }
      const key = AddressKey.from(node.url);
      return node.url === undefined || key === null ? [] : [{ kind: 'link', id: node.id, title: node.title, url: node.url, key, depth }];
    });
  }
}
