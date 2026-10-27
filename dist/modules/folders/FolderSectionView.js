const FAVICON_URL = "chrome://favicon/size/16@2x/";
const ROW_ATTRIBUTES = ["data-vivarcdi-folder-id", "data-vivarcdi-link-id"];
class FolderSectionView {
  #document;
  #handlers;
  #element;
  #links = /* @__PURE__ */ new Map();
  /**
   * Draws the rows of the section with plain DOM calls and handles every click with one listener.
   * It reads nothing from the bookmarks and changes none.
   *
   * @param document The browser window document.
   * @param handlers What a click on a folder row and on a link row does.
   * @param maxHeightPercent The most the section may take of the window's height before it scrolls.
   */
  constructor(document, handlers, maxHeightPercent) {
    this.#document = document;
    this.#handlers = handlers;
    this.#element = document.createElement("div");
    this.#element.setAttribute("data-vivarcdi-folders", "");
    this.#element.style.setProperty("--vivarcdi-folders-max-height", String(maxHeightPercent));
    this.#element.addEventListener("click", (event) => this.#click(event));
    this.#element.addEventListener("error", (event) => FolderSectionView.#fallbackIcon(event), true);
  }
  /**
   * @returns The element to put in the tab bar.
   */
  get element() {
    return this.#element;
  }
  /**
   * Replaces the rows. An empty list hides the section.
   *
   * @param rows What to show.
   */
  render(rows) {
    this.#links.clear();
    this.#element.replaceChildren(...rows.map((row) => this.#row(row)));
    this.#element.toggleAttribute("hidden", rows.length === 0);
  }
  /**
   * Removes the section from the document.
   */
  remove() {
    this.#element.remove();
  }
  #row(row) {
    const element = this.#document.createElement("div");
    element.setAttribute("role", row.kind === "folder" ? "treeitem" : "link");
    element.setAttribute("title", row.title);
    element.style.setProperty("--vivarcdi-depth", String(row.depth));
    const label = this.#document.createElement("span");
    label.className = "vivarcdi-folders-title";
    label.textContent = row.title;
    if (row.kind === "folder") {
      element.setAttribute("data-vivarcdi-folder-id", row.id);
      element.toggleAttribute("data-vivarcdi-open", row.open);
      element.setAttribute("aria-expanded", String(row.open));
      element.append(this.#folderIcon(), label);
    } else {
      this.#links.set(row.id, { url: row.url, key: row.key });
      element.setAttribute("data-vivarcdi-link-id", row.id);
      element.toggleAttribute("data-vivarcdi-link-open", row.tab !== void 0);
      element.append(this.#linkIcon(row), label);
    }
    return element;
  }
  #folderIcon() {
    const icon = this.#document.createElement("span");
    icon.className = "vivarcdi-folders-folder-icon";
    return icon;
  }
  #linkIcon(row) {
    const icon = this.#document.createElement("img");
    icon.className = "vivarcdi-folders-icon";
    icon.setAttribute("alt", "");
    icon.setAttribute("src", row.tab?.favIconUrl ?? `${FAVICON_URL}${row.url}`);
    icon.setAttribute("data-letter", FolderSectionView.#letter(row.title));
    return icon;
  }
  static #letter(title) {
    return (title.trim()[0] ?? "?").toUpperCase();
  }
  /** An icon that fails to load is replaced by the first letter of the title. */
  static #fallbackIcon(event) {
    const target = event.target;
    if (target?.tagName === "IMG") {
      const letter = target.ownerDocument.createElement("span");
      letter.className = "vivarcdi-folders-icon vivarcdi-folders-letter";
      letter.textContent = target.getAttribute("data-letter");
      target.replaceWith(letter);
    }
  }
  #click(event) {
    const row = event.target?.closest(ROW_ATTRIBUTES.map((name) => `[${name}]`).join(","));
    if (row === null || row === void 0) {
      return;
    }
    const folderId = row.getAttribute("data-vivarcdi-folder-id");
    if (folderId !== null) {
      this.#handlers.onFolder(folderId);
      return;
    }
    const link = this.#links.get(row.getAttribute("data-vivarcdi-link-id") ?? "");
    if (link !== void 0) {
      this.#handlers.onLink(link);
    }
  }
}
export {
  FolderSectionView
};
