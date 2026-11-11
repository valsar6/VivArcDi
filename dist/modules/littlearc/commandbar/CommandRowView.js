import { LinkIcon } from "../../folders/LinkIcon.js";
import { SEARCH_SHAPES, svgIcon } from "../SvgIcon.js";
import { COMMAND_BAR_CLASS } from "./CommandBarElements.js";
import { MiddleEllipsis } from "./MiddleEllipsis.js";
const HOST_MAX_CHARS = 22;
const ROW_ATTRIBUTE = "data-index";
const LETTER_CLASS = `${COMMAND_BAR_CLASS}-letter`;
const ROW_ICON_SIZE = "14";
const GLOBE_SHAPES = [
  ["circle", { cx: "12", cy: "12", r: "9" }],
  ["path", { d: "M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" }]
];
const SYMBOLS = { search: SEARCH_SHAPES, globe: GLOBE_SHAPES };
class CommandRowView {
  /**
   * Makes the element of a row: an icon, the title and, after a dash, the host cut in the middle when
   * it is long. A title that is too long is cut at its end by the style sheet.
   *
   * @param document The document of the main window.
   * @param row What the row shows.
   * @param index Its place in the list.
   * @returns The row element, selected or not.
   */
  static create(document, row, index) {
    const element = document.createElement("div");
    element.className = `${COMMAND_BAR_CLASS}-row`;
    element.setAttribute("role", "option");
    element.setAttribute(ROW_ATTRIBUTE, String(index));
    const title = document.createElement("span");
    title.className = `${COMMAND_BAR_CLASS}-title`;
    title.textContent = row.title;
    element.append(CommandRowView.#icon(document, row), title);
    if (row.host !== "") {
      const host = document.createElement("span");
      host.className = `${COMMAND_BAR_CLASS}-host`;
      host.textContent = `\u2014 ${MiddleEllipsis.of(row.host, HOST_MAX_CHARS)}`;
      element.append(host);
    }
    return element;
  }
  static #icon(document, row) {
    const className = `${COMMAND_BAR_CLASS}-icon`;
    if (row.icon === "favicon") {
      return LinkIcon.create(document, { url: row.url, title: row.title }, className, row.favicon);
    }
    const tile = document.createElement("span");
    tile.className = className;
    tile.append(svgIcon(document, SYMBOLS[row.icon], { size: ROW_ICON_SIZE, stroke: "2.2" }));
    return tile;
  }
}
export {
  CommandRowView,
  HOST_MAX_CHARS,
  LETTER_CLASS,
  ROW_ATTRIBUTE
};
