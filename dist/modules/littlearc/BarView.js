import { SEARCH_SHAPES, svgIcon } from "./SvgIcon.js";
const BAR_CLASS = "vivarcdi-little-arc-bar";
const PLACEHOLDER = "Search or Enter URL\u2026";
const ICON_SIZE = "14";
const BACK_SHAPES = [["path", { d: "M15 6l-6 6 6 6" }]];
class BarView {
  root;
  back;
  field;
  keep;
  #prefix;
  #name;
  #shortcut;
  /**
   * The elements of the bar, left to right: the space of the window buttons, back, the address pill
   * and the Open in button. It holds no behavior; `LittleArcBar` listens to it.
   *
   * @param document The document of the popup.
   */
  constructor(document) {
    this.root = BarView.#element(document, "div", BAR_CLASS);
    const inset = BarView.#element(document, "span", `${BAR_CLASS}-inset`);
    this.back = BarView.#button(document, `${BAR_CLASS}-back`, "Back");
    this.back.append(svgIcon(document, BACK_SHAPES, { size: ICON_SIZE, stroke: "2.4" }));
    this.back.hidden = true;
    this.field = BarView.#field(document);
    const pill = BarView.#element(document, "label", `${BAR_CLASS}-pill`);
    pill.append(svgIcon(document, SEARCH_SHAPES, { size: ICON_SIZE, stroke: "2.2" }), this.field);
    this.keep = BarView.#button(document, `${BAR_CLASS}-keep`, "Open in workspace");
    this.#prefix = document.createElement("span");
    this.#name = document.createElement("strong");
    this.#shortcut = document.createElement("kbd");
    this.keep.append(this.#prefix, this.#name, this.#shortcut);
    this.root.append(inset, this.back, pill, this.keep);
  }
  /**
   * @param label The words of the Open in button.
   */
  showLabel(label) {
    this.#prefix.textContent = label.prefix;
    this.#name.textContent = label.name;
    this.#shortcut.textContent = label.shortcut;
    this.keep.setAttribute("aria-label", `${label.prefix} ${label.name}`);
  }
  static #element(document, tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
  static #button(document, className, label) {
    const button = BarView.#element(document, "button", className);
    button.type = "button";
    button.setAttribute("aria-label", label);
    return button;
  }
  static #field(document) {
    const field = document.createElement("input");
    field.type = "text";
    field.placeholder = PLACEHOLDER;
    field.spellcheck = false;
    field.setAttribute("aria-label", "Search or enter address");
    return field;
  }
}
export {
  BAR_CLASS,
  BarView,
  PLACEHOLDER
};
