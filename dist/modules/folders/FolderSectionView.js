import { EDIT_ATTRIBUTE, FolderNameEditor } from "./FolderNameEditor.js";
import { LinkIcon } from "./LinkIcon.js";
const ICON_CLASS = "vivarcdi-folders-icon";
const LETTER_CLASS = "vivarcdi-folders-icon vivarcdi-folders-letter";
const ROW_ATTRIBUTES = ["data-vivarcdi-folder-id", "data-vivarcdi-link-id"];
const CLOSE_ATTRIBUTE = "data-vivarcdi-link-close";
const CLOSE_LABEL = "Close tab";
const CLICK_DELAY_MS = 250;
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class FolderSectionView {
  #document;
  #handlers;
  #element;
  #links = /* @__PURE__ */ new Map();
  #timers;
  #editor;
  #rows = [];
  #toggle = null;
  /**
   * Draws the rows of the section with plain DOM calls and handles every click with one listener.
   * It reads nothing from the bookmarks and changes none: a new name is only reported. The name of
   * a folder row can be edited in place. A single click on a folder row waits for the double click
   * time, so that a double click edits the name and does not toggle the folder.
   *
   * @param document The browser window document.
   * @param handlers What a click on a folder row, on a link row and on the close button of a link row does, and what a new name does.
   * @param maxHeightPercent The most the section may take of the window's height before it scrolls.
   * @param timers Timers, replaceable in tests.
   */
  constructor(document, handlers, maxHeightPercent, timers = defaultTimers) {
    this.#document = document;
    this.#handlers = handlers;
    this.#timers = timers;
    this.#editor = new FolderNameEditor(document, timers, (id, name) => this.#finished(id, name));
    this.#element = document.createElement("div");
    this.#element.setAttribute("data-vivarcdi-folders", "");
    this.#element.style.setProperty("--vivarcdi-folders-max-height", String(maxHeightPercent));
    this.#element.addEventListener("click", (event) => this.#click(event));
    this.#element.addEventListener("dblclick", (event) => this.#doubleClick(event));
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
    this.#rows = rows;
    this.#editor.prepare(rows);
    this.#links.clear();
    this.#element.replaceChildren(...rows.map((row) => this.#row(row)));
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
    this.#editor.dispose();
    this.#element.remove();
  }
  #row(row) {
    const element = this.#document.createElement("div");
    element.setAttribute("role", row.kind === "folder" ? "treeitem" : "link");
    element.setAttribute("title", row.title);
    element.style.setProperty("--vivarcdi-depth", String(row.depth));
    element.setAttribute("data-vivarcdi-depth", String(row.depth));
    const label = this.#document.createElement("span");
    label.className = "vivarcdi-folders-title";
    label.textContent = row.title;
    if (row.kind === "folder") {
      element.setAttribute("data-vivarcdi-folder-id", row.id);
      element.toggleAttribute("data-vivarcdi-open", row.open);
      element.setAttribute("aria-expanded", String(row.open));
      element.append(this.#folderIcon(), this.#editor.isEditing(row.id) ? this.#editor.field() : label);
    } else {
      this.#links.set(row.id, { target: { id: row.id, url: row.url, key: row.key }, tabId: row.tab?.tabId });
      element.setAttribute("data-vivarcdi-link-id", row.id);
      element.toggleAttribute("data-vivarcdi-link-open", row.tab !== void 0);
      element.toggleAttribute("data-vivarcdi-link-active", row.tab?.active === true);
      element.toggleAttribute("data-vivarcdi-link-unloaded", row.tab?.unloaded === true);
      element.append(this.#linkIcon(row), label, ...row.tab === void 0 ? [] : [this.#closeButton()]);
    }
    return element;
  }
  #folderIcon() {
    const icon = this.#document.createElement("span");
    icon.className = "vivarcdi-folders-folder-icon";
    return icon;
  }
  #linkIcon(row) {
    return LinkIcon.create(this.#document, row, ICON_CLASS, row.tab?.favIconUrl);
  }
  #closeButton() {
    const button = this.#document.createElement("span");
    button.className = "vivarcdi-folders-close";
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", CLOSE_LABEL);
    button.setAttribute(CLOSE_ATTRIBUTE, "");
    return button;
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
