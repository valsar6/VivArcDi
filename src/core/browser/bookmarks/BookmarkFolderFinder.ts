import type { BookmarkNode } from './BookmarkNode.js';

const SEPARATOR = '/';

export class BookmarkFolderFinder {
  /**
   * @param path Titles of nested folders separated by `/`, for example `Imported/Bookmarks Bar`.
   * @returns The titles, without empty parts.
   */
  public static parsePath(path: string): string[] {
    return path
      .split(SEPARATOR)
      .map((title) => title.trim())
      .filter((title) => title !== '');
  }

  /**
   * Finds a folder by a path of titles. Titles are compared exactly, so `Bookmarks Bar` and
   * `Bookmarks bar` are different folders. The path may start anywhere in the tree; when several
   * folders match, the first one in Vivaldi's order wins.
   *
   * @param tree The bookmark tree, as `getTree` returns it.
   * @param path Titles from the outer folder to the wanted one.
   * @returns The folder, or null when none matches.
   */
  public static find(tree: BookmarkNode[], path: string[]): BookmarkNode | null {
    if (path.length === 0) {
      return null;
    }
    for (const node of tree) {
      const found = BookmarkFolderFinder.#match(node, path) ?? BookmarkFolderFinder.find(node.children ?? [], path);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  static #match(node: BookmarkNode, path: string[]): BookmarkNode | null {
    const [title, ...rest] = path;
    if (node.children === undefined || node.title !== title) {
      return null;
    }
    if (rest.length === 0) {
      return node;
    }
    for (const child of node.children) {
      const found = BookmarkFolderFinder.#match(child, rest);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
}
