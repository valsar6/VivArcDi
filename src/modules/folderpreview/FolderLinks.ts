import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';
import { FolderTree } from '../folders/FolderTree.js';
import type { LinkEntry } from '../folders/FolderTree.js';

const DEPTH_LIMIT = 10;

export interface FolderContent {
  title: string;
  links: LinkEntry[];
}

export class FolderLinks {
  /**
   * Finds a bookmark folder by id and lists its web links, those of its subfolders included, in
   * folder order, with the same rules as the section in the tab bar.
   *
   * @param tree The bookmark tree.
   * @param folderId The id of the folder.
   * @returns The folder title and links, or null when the folder is not in the tree.
   */
  public static find(tree: BookmarkNode[], folderId: string): FolderContent | null {
    for (const node of tree) {
      if (node.id === folderId && node.children !== undefined) {
        return { title: node.title, links: FolderTree.links(FolderTree.build(node.children, DEPTH_LIMIT)) };
      }
      const found = FolderLinks.find(node.children ?? [], folderId);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
}
