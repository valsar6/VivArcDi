import { FOLDER_MINUS_ATTRIBUTE, LINK_MINUS_ATTRIBUTE } from "./FolderRowElement.js";
const MINUS_SELECTOR = `[${LINK_MINUS_ATTRIBUTE}], [${FOLDER_MINUS_ATTRIBUTE}]`;
class FolderMinus {
  /**
   * Says whether open link rows follow a folder, so that its row owns an unload control.
   *
   * @param rows The rows of the section, top to bottom.
   * @param row The folder row.
   * @returns Whether an open link belongs to the folder.
   */
  static hasOpenLinks(rows, row) {
    if (row.kind !== "folder") {
      return false;
    }
    for (let index = rows.indexOf(row) + 1; index < rows.length; index += 1) {
      const next = rows[index];
      if (next === void 0 || next.depth <= row.depth) {
        return false;
      }
      if (next.kind === "link" && next.tab !== void 0) {
        return true;
      }
    }
    return false;
  }
  /**
   * Collects the tabs a minus stands for: one for a link row, every open link below a folder row.
   *
   * @param rows The rows of the section, top to bottom.
   * @param row The row that owns the minus.
   * @param links The open tabs of the link rows, by link id.
   * @returns The tab ids to unload.
   */
  static tabIds(rows, row, links) {
    const folderId = row.getAttribute("data-vivarcdi-folder-id");
    return folderId === null ? FolderMinus.#linkId(row, links) : FolderMinus.#descendantIds(rows, folderId, Number(row.getAttribute("data-vivarcdi-depth")));
  }
  /**
   * Says whether an event starts on one of the minuses.
   *
   * @param target The event target.
   * @returns Whether it is a link or folder minus.
   */
  static isMinus(target) {
    return target?.closest(MINUS_SELECTOR) != null;
  }
  /**
   * Keeps a press on a minus from reaching the row's own click or drag handlers.
   *
   * @param event The pointer event.
   */
  static swallow(event) {
    if (FolderMinus.isMinus(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  static #linkId(row, links) {
    const tabId = links.get(row.getAttribute("data-vivarcdi-link-id") ?? "")?.tabId;
    return tabId === void 0 ? [] : [tabId];
  }
  static #descendantIds(rows, folderId, depth) {
    const ids = [];
    let inside = false;
    for (const row of rows) {
      if (row.kind === "folder" && row.id === folderId) {
        inside = true;
        continue;
      }
      if (!inside) {
        continue;
      }
      if (row.depth <= depth) {
        break;
      }
      if (row.kind === "link" && row.tab !== void 0) {
        ids.push(row.tab.tabId);
      }
    }
    return ids;
  }
}
export {
  FolderMinus
};
