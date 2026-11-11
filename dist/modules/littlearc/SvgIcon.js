const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const ICON_VIEWBOX = "0 0 24 24";
const SEARCH_SHAPES = [
  ["circle", { cx: "11", cy: "11", r: "7" }],
  ["path", { d: "M20 20l-3.5-3.5" }]
];
function svgIcon(document, shapes, { size, stroke }) {
  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  const attributes = { width: size, height: size, viewBox: ICON_VIEWBOX, fill: "none", stroke: "currentColor", "stroke-width": stroke, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
  Object.entries(attributes).forEach(([name, value]) => icon.setAttribute(name, value));
  for (const [tag, shape] of shapes) {
    const part = document.createElementNS(SVG_NAMESPACE, tag);
    Object.entries(shape).forEach(([name, value]) => part.setAttribute(name, value));
    icon.append(part);
  }
  return icon;
}
export {
  SEARCH_SHAPES,
  svgIcon
};
