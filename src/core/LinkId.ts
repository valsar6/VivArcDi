const PREFIX = 'live:';
const SEPARATOR = ':';

export class LinkId {
  /**
   * Virtual ids name the folders and rows that a source fills, such as a live folder. They never
   * exist among Vivaldi's bookmarks, so code that writes bookmarks must skip them.
   *
   * @param id The id of a folder or of a link row.
   * @returns Whether it is a virtual id.
   */
  public static isVirtual(id: string): boolean {
    return id.startsWith(PREFIX);
  }

  /**
   * @param folderId The id the live-folders store gave to a folder.
   * @returns The id of the folder row.
   */
  public static folder(folderId: string): string {
    return `${PREFIX}${folderId}`;
  }

  /**
   * @param folderId The id the live-folders store gave to a folder.
   * @param rowId The id of the item inside the folder.
   * @returns The id of the link row.
   */
  public static row(folderId: string, rowId: string): string {
    return `${PREFIX}${folderId}${SEPARATOR}${rowId}`;
  }

  /**
   * @param id The id of a live folder or of one of its rows.
   * @returns The id of the folder in the store, or null when the id is not virtual.
   */
  public static folderOf(id: string): string | null {
    return LinkId.isVirtual(id) ? (id.slice(PREFIX.length).split(SEPARATOR)[0] ?? null) : null;
  }
}
