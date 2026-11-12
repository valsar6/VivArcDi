export interface FolderEntry {
  kind: 'folder';
  id: string;
  title: string;
  /** Nesting level, 0 for the children of the root. */
  depth: number;
  children: TreeEntry[];
  /** Set on a live folder, whose rows come from a source and not from the bookmarks. */
  live?: true;
  /** Why the last refresh of a live folder failed; the folder shows a warning mark. */
  warning?: string;
}

export interface LinkEntry {
  kind: 'link';
  id: string;
  title: string;
  url: string;
  /** Address key used to match the link with a tab. */
  key: string;
  depth: number;
  /** A second line under the title, such as the author of a pull request. */
  subtitle?: string;
}

export type TreeEntry = FolderEntry | LinkEntry;
