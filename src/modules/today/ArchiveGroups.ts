import type { ArchiveEntry } from './ArchiveStore.js';

export interface ArchiveGroup {
  /** "Today", "Yesterday" or the date. */
  label: string;
  /** The entries of that day, newest first. */
  entries: ArchiveEntry[];
}

const TODAY = 'Today';
const YESTERDAY = 'Yesterday';

export class ArchiveGroups {
  /**
   * Groups entries by the local day they were archived.
   *
   * @param entries The entries, newest first.
   * @param now The current date.
   * @param locale A language tag for the dates, such as `en-US`.
   * @returns One group per day, newest first.
   */
  public static byDay(entries: readonly ArchiveEntry[], now: Date, locale: string): ArchiveGroup[] {
    const groups = new Map<number, ArchiveEntry[]>();
    for (const entry of entries) {
      const day = ArchiveGroups.#dayOf(new Date(entry.archivedAt));
      groups.set(day, [...(groups.get(day) ?? []), entry]);
    }
    const today = ArchiveGroups.#dayOf(now);
    const yesterday = ArchiveGroups.#dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    return [...groups].map(([day, dayEntries]) => ({
      label: day === today ? TODAY : day === yesterday ? YESTERDAY : format.format(new Date(day)),
      entries: dayEntries,
    }));
  }

  static #dayOf(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
}
