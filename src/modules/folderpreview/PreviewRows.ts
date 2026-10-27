import type { LinkEntry } from '../folders/FolderTree.js';

export interface PreviewRow {
  link: LinkEntry;
  /** When the link was last opened, or null when no record exists. */
  openedAt: Date | null;
}

export interface OpenedDates {
  get(key: string): Date | null;
}

export class PreviewRows {
  /**
   * Orders the links of a folder for the panel: recorded ones by last opening, newest first, then
   * the unrecorded ones in folder order.
   *
   * @param links The links in folder order.
   * @param dates The last-opened records.
   * @returns The rows.
   */
  public static build(links: LinkEntry[], dates: OpenedDates): PreviewRow[] {
    const rows = links.map((link): PreviewRow => ({ link, openedAt: dates.get(link.key) }));
    const recorded = rows.filter((row) => row.openedAt !== null).sort((a, b) => (b.openedAt?.getTime() ?? 0) - (a.openedAt?.getTime() ?? 0));
    return [...recorded, ...rows.filter((row) => row.openedAt === null)];
  }

  /**
   * @param rows The rows of the panel.
   * @param query The text typed in the search field.
   * @returns The rows whose title or address contains the text, ignoring case; all rows for an empty text.
   */
  public static filter(rows: PreviewRow[], query: string): PreviewRow[] {
    const needle = query.trim().toLowerCase();
    if (needle === '') {
      return rows;
    }
    return rows.filter(({ link }) => link.title.toLowerCase().includes(needle) || link.url.toLowerCase().includes(needle));
  }
}
