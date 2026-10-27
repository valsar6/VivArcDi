import type { FolderEntry, LinkEntry, TreeEntry } from './FolderTree.js';
import { FolderTree } from './FolderTree.js';
import type { OpenTab } from './OpenLinks.js';

export interface FolderRow {
  kind: 'folder';
  id: string;
  title: string;
  depth: number;
  open: boolean;
}

export interface LinkRow {
  kind: 'link';
  id: string;
  title: string;
  url: string;
  key: string;
  depth: number;
  /** The tab that shows the link, if any. */
  tab: OpenTab | undefined;
}

export type Row = FolderRow | LinkRow;

export interface RowSources {
  isOpen: (folderId: string) => boolean;
  tabFor: (key: string) => OpenTab | undefined;
}

export class FolderRows {
  /**
   * Decides which rows the section shows. An open folder shows its children. A closed folder shows
   * none of them, except the links that have an open tab, which stay below it, one level in, so
   * that what is in use is always visible.
   *
   * @param entries The tree of folders and links.
   * @param sources Which folders are open and which links have a tab.
   * @returns The rows, top to bottom.
   */
  public static build(entries: TreeEntry[], sources: RowSources): Row[] {
    return entries.flatMap((entry) => (entry.kind === 'link' ? [FolderRows.#link(entry, entry.depth, sources)] : FolderRows.#folder(entry, sources)));
  }

  static #folder(folder: FolderEntry, sources: RowSources): Row[] {
    const open = sources.isOpen(folder.id);
    const own: FolderRow = { kind: 'folder', id: folder.id, title: folder.title, depth: folder.depth, open };
    if (open) {
      return [own, ...FolderRows.build(folder.children, sources)];
    }
    const staying = FolderTree.links(folder.children).filter((link) => sources.tabFor(link.key) !== undefined);
    return [own, ...staying.map((link) => FolderRows.#link(link, folder.depth + 1, sources))];
  }

  static #link(link: LinkEntry, depth: number, sources: RowSources): LinkRow {
    return { kind: 'link', id: link.id, title: link.title, url: link.url, key: link.key, depth, tab: sources.tabFor(link.key) };
  }
}
