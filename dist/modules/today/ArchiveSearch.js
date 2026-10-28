class ArchiveSearch {
  /**
   * Keeps the entries whose title or address contains a text, ignoring case.
   *
   * @param entries The entries, in their order.
   * @param query The text typed in the search field; blank keeps every entry.
   * @returns The matching entries, in the same order.
   */
  static filter(entries, query) {
    const text = query.trim().toLowerCase();
    return entries.filter(({ title, url }) => text === "" || title.toLowerCase().includes(text) || url.toLowerCase().includes(text));
  }
}
export {
  ArchiveSearch
};
