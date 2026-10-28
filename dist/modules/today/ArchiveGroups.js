const TODAY = "Today";
const YESTERDAY = "Yesterday";
class ArchiveGroups {
  /**
   * Groups entries by the local day they were archived.
   *
   * @param entries The entries, newest first.
   * @param now The current date.
   * @param locale A language tag for the dates, such as `en-US`.
   * @returns One group per day, newest first.
   */
  static byDay(entries, now, locale) {
    const groups = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const day = ArchiveGroups.#dayOf(new Date(entry.archivedAt));
      groups.set(day, [...groups.get(day) ?? [], entry]);
    }
    const today = ArchiveGroups.#dayOf(now);
    const yesterday = ArchiveGroups.#dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    return [...groups].map(([day, dayEntries]) => ({
      label: day === today ? TODAY : day === yesterday ? YESTERDAY : format.format(new Date(day)),
      entries: dayEntries
    }));
  }
  static #dayOf(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
}
export {
  ArchiveGroups
};
