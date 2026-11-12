import { EDIT_ATTRIBUTE, FolderNameEditor } from "./FolderNameEditor.js";
import { CLOSE_ATTRIBUTE, FolderRowElement, ICON_CLASS, LIVE_FOLDER_ATTRIBUTE } from "./FolderRowElement.js";
import { LinkIcon } from "./LinkIcon.js";
import { LEAVING_ATTRIBUTE, RowTransition } from "./RowTransition.js";
const LETTER_CLASS = `${ICON_CLASS} vivarcdi-folders-letter`;
const ROW_ATTRIBUTES = ["data-vivarcdi-folder-id", "data-vivarcdi-link-id"];
const CLICK_DELAY_MS = 250;
const LEAVE_MS = 220;
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class FolderSectionView {
  #handlers;
  #element;
  #links = /* @__PURE__ */ new Map();
  #timers;
  #editor;
  #elements;
  #rows = [];
  #toggle = null;
  #toggled = false;
  #leaving = null;
  /**
   * Draws the rows of the section with plain DOM calls and handles every click with one listener.
   * It reads nothing from the bookmarks and changes none: a new name is only reported. The name of
   * a folder row can be edited in place. A single click on a folder row waits for the double click
   * time, so that a double click edits the name and does not toggle the folder. A live folder
   * row has its own icon and a warning mark, a right click on it reports the point for its menu,
   * and a link row with a subtitle shows it under the title.
   *
   * @param document The browser window document.
   * @param handlers What a click on a folder row, on a link row and on the close button of a link row does, what a new name does, and what a right click on a live folder does.
   * @param maxHeightPercent The most the section may take of the window's height before it scrolls.
   * @param timers Timers, replaceable in tests.
   */
  constructor(document, handlers, maxHeightPercent, timers = defaultTimers) {
    this.#handlers = handlers;
    this.#timers = timers;
    this.#editor = new FolderNameEditor(document, timers, (id, name) => this.#finished(id, name));
    this.#elements = new FolderRowElement(document, this.#editor);
    this.#element = document.createElement("div");
    this.#element.setAttribute("data-vivarcdi-folders", "");
    this.#element.style.setProperty("--vivarcdi-folders-max-height", String(maxHeightPercent));
    this.#element.addEventListener("click", (event) => this.#click(event));
    this.#element.addEventListener("dblclick", (event) => this.#doubleClick(event));
    this.#element.addEventListener("contextmenu", (event) => this.#contextMenu(event), true);
    this.#element.addEventListener("error", (event) => LinkIcon.fallback(event, LETTER_CLASS), true);
  }
  /**
   * @returns The element to put in the tab bar.
   */
  get element() {
    return this.#element;
  }
  /**
   * Replaces the rows. An empty list hides the section. The row being edited stays an input with
   * the text typed so far.
   *
   * @param rows What to show.
   */
  render(rows) {
    this.#cancelLeave();
    this.#editor.prepare(rows);
    this.#links.clear();
    const drawn = this.#toggled ? RowTransition.merge(this.#rows, rows) : rows.map((row) => ({ row, state: "steady" }));
    this.#rows = rows;
    this.#toggled = false;
    const elements = drawn.map(({ row, state }) => RowTransition.mark(this.#row(row), state));
    this.#element.replaceChildren(...elements);
    if (drawn.some(({ state }) => state === "leaving")) {
      this.#leaving = this.#timers.set(() => elements.filter((node) => node.hasAttribute(LEAVING_ATTRIBUTE)).forEach((node) => node.remove()), LEAVE_MS);
    }
    this.#element.toggleAttribute("hidden", rows.length === 0);
    this.#editor.focus();
  }
  /**
   * Starts editing the name of a folder row. A folder that is not drawn yet, such as one just
   * created, is edited as soon as it appears, for a few seconds.
   *
   * @param folderId The bookmark id of the folder.
   */
  edit(folderId) {
    const row = this.#rows.find((candidate) => candidate.kind === "folder" && candidate.id === folderId);
    if (row === void 0) {
      this.#editor.wait(folderId);
      return;
    }
    this.#cancelToggle();
    this.#editor.begin(folderId, row.title);
    this.render(this.#rows);
  }
  /**
   * Hides the section without leaving a gap while there is no root folder to show.
   *
   * @param empty Whether the root in use is empty.
   */
  setEmpty(empty) {
    this.#element.toggleAttribute("data-vivarcdi-empty", empty);
  }
  /**
   * Removes the section from the document.
   */
  remove() {
    this.#cancelToggle();
    this.#cancelLeave();
    this.#editor.dispose();
    this.#element.remove();
  }
  #cancelLeave() {
    if (this.#leaving !== null) {
      this.#timers.clear(this.#leaving);
      this.#leaving = null;
    }
  }
  #row(row) {
    if (row.kind === "link") {
      this.#links.set(row.id, { target: { id: row.id, url: row.url, key: row.key }, tabId: row.tab?.tabId });
    }
    return this.#elements.create(row);
  }
  #click(event) {
    const target = event.target;
    const row = FolderSectionView.#rowOf(target);
    if (row === null || target?.closest(`[${EDIT_ATTRIBUTE}]`) != null) {
      return;
    }
    if (target?.closest(`[${CLOSE_ATTRIBUTE}]`) !== null) {
      this.#close(row);
    } else {
      this.#open(row);
    }
  }
  #doubleClick(event) {
    const target = event.target;
    const folderId = FolderSectionView.#rowOf(target)?.getAttribute("data-vivarcdi-folder-id") ?? null;
    if (folderId !== null && target?.closest(`[${EDIT_ATTRIBUTE}]`) == null) {
      this.edit(folderId);
    }
  }
  #contextMenu(event) {
    const row = FolderSectionView.#rowOf(event.target);
    const folderId = row?.hasAttribute(LIVE_FOLDER_ATTRIBUTE) === true ? row.getAttribute("data-vivarcdi-folder-id") : null;
    if (folderId !== null) {
      event.preventDefault();
      event.stopPropagation();
      this.#handlers.onMenu(folderId, event.clientX, event.clientY);
    }
  }
  #finished(folderId, name) {
    if (name !== null) {
      this.#rows = this.#rows.map((row) => row.kind === "folder" && row.id === folderId ? { ...row, title: name } : row);
      this.#handlers.onRename(folderId, name);
    }
    this.render(this.#rows);
  }
  static #rowOf(target) {
    return target?.closest(ROW_ATTRIBUTES.map((name) => `[${name}]`).join(",")) ?? null;
  }
  #open(row) {
    const folderId = row.getAttribute("data-vivarcdi-folder-id");
    if (folderId !== null) {
      this.#clickFolder(folderId);
      return;
    }
    const link = this.#links.get(row.getAttribute("data-vivarcdi-link-id") ?? "");
    if (link !== void 0) {
      this.#handlers.onLink(link.target);
    }
  }
  #clickFolder(folderId) {
    if (this.#toggle !== null) {
      this.#cancelToggle();
      return;
    }
    this.#toggle = this.#timers.set(() => {
      this.#toggle = null;
      this.#toggled = true;
      this.#handlers.onFolder(folderId);
    }, CLICK_DELAY_MS);
  }
  #cancelToggle() {
    if (this.#toggle !== null) {
      this.#timers.clear(this.#toggle);
      this.#toggle = null;
    }
  }
  #close(row) {
    const tabId = this.#links.get(row.getAttribute("data-vivarcdi-link-id") ?? "")?.tabId;
    if (tabId !== void 0) {
      this.#handlers.onClose(tabId);
    }
  }
}
export {
  FolderSectionView
};
