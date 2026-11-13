/** A bookmark or a bookmark folder, as `chrome.bookmarks` reports it. */
export interface BookmarkNode {
  id: string;
  /** The folder that holds it; absent on the root. */
  parentId?: string | undefined;
  /** Position among the children of its parent, when `chrome.bookmarks` reports it. */
  index?: number | undefined;
  title: string;
  /** Vivaldi keeps a free text on every bookmark; absent when empty. */
  description?: string | undefined;
  /** Present on links, absent on folders. */
  url?: string | undefined;
  /** Present on folders, in Vivaldi's order. */
  children?: BookmarkNode[] | undefined;
  /** Vivaldi marks the lines it draws between bookmarks. */
  separator?: boolean | undefined;
  /** Vivaldi marks its bookmark Trash, a top-level folder. */
  trash?: boolean | undefined;
}
