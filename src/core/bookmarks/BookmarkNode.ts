/** A bookmark or a bookmark folder, as `chrome.bookmarks` reports it. */
export interface BookmarkNode {
  id: string;
  /** The folder that holds it; absent on the root. */
  parentId?: string | undefined;
  title: string;
  /** Present on links, absent on folders. */
  url?: string | undefined;
  /** Present on folders, in Vivaldi's order. */
  children?: BookmarkNode[] | undefined;
  /** Vivaldi marks the lines it draws between bookmarks. */
  separator?: boolean | undefined;
}
