import { IconSymbols } from "./IconSymbols.js";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_ATTRIBUTES = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" };
const SIZE = "1em";
class LabelIcon {
  /**
   * Draws a symbol: an inline `svg` of one path, in the color of the text around it.
   *
   * @param document The browser window document.
   * @param path The path of the symbol, in a 24 by 24 box.
   * @returns The `svg` element.
   */
  static glyph(document, path) {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    const shape = document.createElementNS(SVG_NAMESPACE, "path");
    shape.setAttribute("d", path);
    Object.entries(SVG_ATTRIBUTES).forEach(([name, value]) => svg.setAttribute(name, value));
    svg.append(shape);
    return svg;
  }
  /**
   * Makes the icon a label chose.
   *
   * @param document The browser window document.
   * @param icon An emoji, or the id of a symbol.
   * @param className The class of the icon.
   * @returns A `span` with the emoji as text or with the symbol as `svg`, or null when the symbol is not known, so the caller draws the favicon.
   */
  static create(document, icon, className) {
    const span = document.createElement("span");
    span.className = className;
    if ("emoji" in icon) {
      span.textContent = icon.emoji;
      return span;
    }
    const symbol = IconSymbols.byId(icon.symbol);
    if (symbol === void 0) {
      return null;
    }
    const svg = LabelIcon.glyph(document, symbol.path);
    svg.setAttribute("width", SIZE);
    svg.setAttribute("height", SIZE);
    span.append(svg);
    return span;
  }
}
export {
  LabelIcon
};
