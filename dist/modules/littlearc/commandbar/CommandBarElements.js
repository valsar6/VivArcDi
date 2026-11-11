import { SEARCH_SHAPES, svgIcon } from "../SvgIcon.js";
const COMMAND_BAR_CLASS = "vivarcdi-command-bar";
const PLACEHOLDER = "Search or Enter URL\u2026";
const SEARCH_ICON_SIZE = "22";
const CLOSE_ICON_SIZE = "12";
const CLOSE_SHAPES = [["path", { d: "M6 6l12 12M18 6L6 18" }]];
class CommandBarFactory {
  /**
   * Builds the elements of the command bar, not yet in the page: a transparent layer that covers the
   * window and catches outside clicks, holding the card with the field row (search icon, field and ×
   * button), a divider and the list of rows.
   *
   * @param document The document of the main window.
   * @returns The elements.
   */
  static create(document) {
    const catcher = CommandBarFactory.#element(document, "div", `${COMMAND_BAR_CLASS}-catcher`);
    const card = CommandBarFactory.#element(document, "div", COMMAND_BAR_CLASS);
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Search or enter address");
    const row = CommandBarFactory.#element(document, "div", `${COMMAND_BAR_CLASS}-field`);
    const input = CommandBarFactory.#input(document);
    const close = CommandBarFactory.#close(document);
    row.append(svgIcon(document, SEARCH_SHAPES, { size: SEARCH_ICON_SIZE, stroke: "2.2" }), input, close);
    const divider = CommandBarFactory.#element(document, "div", `${COMMAND_BAR_CLASS}-divider`);
    const list = CommandBarFactory.#element(document, "div", `${COMMAND_BAR_CLASS}-list`);
    list.setAttribute("role", "listbox");
    card.append(row, divider, list);
    catcher.append(card);
    return { catcher, card, input, close, list };
  }
  static #element(document, tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
  static #input(document) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = `${COMMAND_BAR_CLASS}-input`;
    input.placeholder = PLACEHOLDER;
    input.spellcheck = false;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", "Search or enter address");
    return input;
  }
  static #close(document) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${COMMAND_BAR_CLASS}-close`;
    button.setAttribute("aria-label", "Close");
    button.append(svgIcon(document, CLOSE_SHAPES, { size: CLOSE_ICON_SIZE, stroke: "2.4" }));
    return button;
  }
}
export {
  COMMAND_BAR_CLASS,
  CommandBarFactory,
  PLACEHOLDER
};
