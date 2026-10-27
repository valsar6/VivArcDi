import { LinkIcon } from "../folders/LinkIcon.js";
import { RelativeTime } from "./RelativeTime.js";
const ROW_LIMIT = 100;
const ICON_CLASS = "vivarcdi-preview-icon";
const LETTER_CLASS = "vivarcdi-preview-icon vivarcdi-preview-letter";
const EDGE_GAP = 8;
class PreviewPanelView {
  #document;
  #parent;
  #handlers;
  #panel = null;
  #list = null;
  #content = null;
  /**
   * The panel of a folder: a search field and one row per link with the time since it was last
   * opened. Key presses in the field stop here, so Vivaldi's shortcuts do not see them.
   *
   * @param document The browser window document.
   * @param parent The element the panel is added to.
   * @param handlers What a chosen row and a close request do.
   */
  constructor(document, parent, handlers) {
    this.#document = document;
    this.#parent = parent;
    this.#handlers = handlers;
  }
  /**
   * @returns Whether the panel is on screen.
   */
  get isOpen() {
    return this.#panel !== null;
  }
  /**
   * Shows the panel for a folder, replacing any panel already open, and focuses its search field.
   *
   * @param content What to show.
   * @param placement Where the folder row and the tab bar are.
   */
  open(content, placement) {
    this.close();
    this.#content = content;
    const panel = this.#document.createElement("div");
    panel.setAttribute("data-vivarcdi-preview", "");
    panel.setAttribute("role", "dialog");
    const input = this.#document.createElement("input");
    input.setAttribute("type", "search");
    input.setAttribute("placeholder", content.texts.search(content.title));
    input.addEventListener("input", () => {
      content.session.setQuery(input.value);
      this.#render();
    });
    this.#list = this.#document.createElement("div");
    this.#list.addEventListener("click", (event) => this.#click(event));
    this.#list.addEventListener("error", (event) => LinkIcon.fallback(event, LETTER_CLASS), true);
    panel.addEventListener("keydown", (event) => this.#key(event));
    panel.append(input, this.#list);
    this.#parent.append(panel);
    this.#panel = panel;
    this.#render();
    this.#place(panel, placement);
    input.focus();
  }
  /**
   * Removes the panel, if any.
   */
  close() {
    this.#panel?.remove();
    this.#panel = null;
    this.#list = null;
    this.#content = null;
  }
  #render() {
    const content = this.#content;
    if (content === null || this.#list === null) {
      return;
    }
    const { rows, highlighted } = content.session;
    const shown = rows.slice(0, ROW_LIMIT).map((row, position) => this.#row(row, position === highlighted, content));
    if (shown.length === 0) {
      const empty = this.#document.createElement("div");
      empty.className = "vivarcdi-preview-empty";
      empty.textContent = content.texts.empty;
      shown.push(empty);
    }
    this.#list.replaceChildren(...shown);
    this.#list.querySelector("[data-vivarcdi-highlight]")?.scrollIntoView?.({ block: "nearest" });
  }
  #row(row, highlighted, { texts, locale, now }) {
    const element = this.#document.createElement("div");
    element.setAttribute("role", "option");
    element.setAttribute("data-vivarcdi-preview-link", row.link.id);
    element.toggleAttribute("data-vivarcdi-highlight", highlighted);
    const title = this.#document.createElement("span");
    title.className = "vivarcdi-preview-title";
    title.textContent = row.link.title;
    const time = this.#document.createElement("span");
    time.className = "vivarcdi-preview-time";
    time.textContent = row.openedAt === null ? texts.never : RelativeTime.format(row.openedAt, now, locale);
    const text = this.#document.createElement("span");
    text.className = "vivarcdi-preview-text";
    text.append(title, time);
    element.append(LinkIcon.create(this.#document, row.link, ICON_CLASS), text);
    return element;
  }
  #click(event) {
    const id = event.target?.closest("[data-vivarcdi-preview-link]")?.getAttribute("data-vivarcdi-preview-link");
    const row = this.#content?.session.rows.find(({ link }) => link.id === id);
    if (row !== void 0) {
      this.#handlers.onActivate(row);
    }
  }
  #key(event) {
    event.stopPropagation();
    const session = this.#content?.session;
    if (session === void 0) {
      return;
    }
    const steps = { ArrowDown: 1, ArrowUp: -1 };
    if (event.key in steps) {
      event.preventDefault();
      session.move(steps[event.key] ?? 0);
      this.#render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = session.activate();
      if (row !== null) {
        this.#handlers.onActivate(row);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.#handlers.onClose();
    }
  }
  #place(panel, { row, bar }) {
    const view = this.#document.defaultView;
    const onRight = view !== null && bar.left > view.innerWidth / 2;
    const top = Math.max(EDGE_GAP, Math.min(row.top, (view?.innerHeight ?? row.top) - panel.offsetHeight - EDGE_GAP));
    panel.style.setProperty("top", `${top}px`);
    panel.style.setProperty(onRight ? "right" : "left", `${onRight ? (view?.innerWidth ?? 0) - bar.left : bar.right}px`);
  }
}
export {
  PreviewPanelView
};
