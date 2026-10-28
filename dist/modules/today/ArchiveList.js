import { LinkIcon } from "../folders/LinkIcon.js";
import { ArchiveGroups } from "./ArchiveGroups.js";
const ENTRY_ATTRIBUTE = "data-vivarcdi-archive-entry";
const ROW_LIMIT = 200;
const ICON_CLASS = "vivarcdi-archive-icon";
const LETTER_CLASS = "vivarcdi-archive-icon vivarcdi-archive-letter";
const EMPTY_TEXT = "No archived tabs";
class ArchiveList {
  #document;
  #element;
  #times;
  #locale;
  /**
   * The list of the archive panel: one heading per day, then one row per entry with its favicon,
   * title, host and time. One listener handles every click.
   *
   * @param document The browser window document.
   * @param locale A language tag for dates and times.
   * @param onChoose Called with the position of a clicked entry among the searched entries.
   */
  constructor(document, locale, onChoose) {
    this.#document = document;
    this.#locale = locale;
    this.#times = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
    this.#element = document.createElement("div");
    this.#element.className = "vivarcdi-archive-list";
    this.#element.setAttribute("role", "listbox");
    this.#element.addEventListener("click", (event) => {
      const position = event.target?.closest?.(`[${ENTRY_ATTRIBUTE}]`)?.getAttribute(ENTRY_ATTRIBUTE);
      if (position != null) {
        onChoose(Number(position));
      }
    });
    this.#element.addEventListener("error", (event) => LinkIcon.fallback(event, LETTER_CLASS), true);
  }
  /**
   * @returns The element to put in the panel.
   */
  get element() {
    return this.#element;
  }
  /**
   * Draws the entries left by the search, with the highlighted one marked.
   *
   * @param session The state of the panel.
   * @param now The current date, which decides "Today" and "Yesterday".
   */
  render(session, now) {
    const shown = session.entries.slice(0, ROW_LIMIT);
    const positions = new Map(shown.map((entry, position) => [entry, position]));
    const children = ArchiveGroups.byDay(shown, now, this.#locale).flatMap((group) => [
      this.#heading(group.label),
      ...group.entries.map((entry) => this.#row(entry, positions.get(entry) ?? -1, session.highlighted))
    ]);
    this.#element.replaceChildren(...children.length === 0 ? [this.#empty()] : children);
    this.#element.querySelector("[data-vivarcdi-highlight]")?.scrollIntoView?.({ block: "nearest" });
  }
  #heading(label) {
    const heading = this.#document.createElement("div");
    heading.className = "vivarcdi-archive-day";
    heading.textContent = label;
    return heading;
  }
  #row(entry, position, highlighted) {
    const row = this.#document.createElement("div");
    row.setAttribute("role", "option");
    row.setAttribute("title", entry.url);
    row.setAttribute(ENTRY_ATTRIBUTE, String(position));
    row.toggleAttribute("data-vivarcdi-highlight", position === highlighted);
    const title = this.#text("vivarcdi-archive-title", entry.title);
    const meta = this.#text("vivarcdi-archive-meta", `${ArchiveList.#hostOf(entry.url)} \xB7 ${this.#times.format(new Date(entry.archivedAt))}`);
    const text = this.#document.createElement("span");
    text.className = "vivarcdi-archive-text";
    text.append(title, meta);
    row.append(LinkIcon.create(this.#document, entry, ICON_CLASS, entry.favIconUrl ?? void 0), text);
    return row;
  }
  #text(className, content) {
    const span = this.#document.createElement("span");
    span.className = className;
    span.textContent = content;
    return span;
  }
  #empty() {
    const empty = this.#document.createElement("div");
    empty.className = "vivarcdi-archive-empty";
    empty.textContent = EMPTY_TEXT;
    return empty;
  }
  static #hostOf(url) {
    try {
      return new URL(url).host || url;
    } catch {
      return url;
    }
  }
}
export {
  ArchiveList
};
