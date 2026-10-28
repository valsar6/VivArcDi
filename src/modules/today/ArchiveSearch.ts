import type { ArchiveEntry } from './ArchiveStore.js';

export class ArchiveSearch {
  /**
   * Keeps the entries whose title or address contains a text, ignoring case.
   *
   * @param entries The entries, in their order.
   * @param query The text typed in the search field; blank keeps every entry.
   * @returns The matching entries, in the same order.
   */
  public static filter(entries: readonly ArchiveEntry[], query: string): ArchiveEntry[] {
    const text = query.trim().toLowerCase();
    return entries.filter(({ title, url }) => text === '' || title.toLowerCase().includes(text) || url.toLowerCase().includes(text));
  }
}
