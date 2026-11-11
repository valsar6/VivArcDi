const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ICON_VIEWBOX = '0 0 24 24';

export type IconShapes = ReadonlyArray<readonly [string, Record<string, string>]>;

export const SEARCH_SHAPES: IconShapes = [
  ['circle', { cx: '11', cy: '11', r: '7' }],
  ['path', { d: 'M20 20l-3.5-3.5' }],
];

/**
 * Draws a line icon on a 24 by 24 grid, in the color of the text around it.
 *
 * @param document The document that owns the icon.
 * @param shapes The shapes of the icon: a tag and its attributes.
 * @param look The size in pixels and the width of the stroke.
 * @param look.size The width and the height, in pixels.
 * @param look.stroke The width of the line.
 * @returns The `svg` element.
 */
export function svgIcon(document: Document, shapes: IconShapes, { size, stroke }: { size: string; stroke: string }): SVGElement {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
  const attributes = { width: size, height: size, viewBox: ICON_VIEWBOX, fill: 'none', stroke: 'currentColor', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
  Object.entries(attributes).forEach(([name, value]) => icon.setAttribute(name, value));
  for (const [tag, shape] of shapes) {
    const part = document.createElementNS(SVG_NAMESPACE, tag);
    Object.entries(shape).forEach(([name, value]) => part.setAttribute(name, value));
    icon.append(part);
  }
  return icon;
}
