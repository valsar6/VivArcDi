import { LinkIcon } from '../../folders/LinkIcon.js';
import { SEARCH_SHAPES, svgIcon } from '../SvgIcon.js';
import type { IconShapes } from '../SvgIcon.js';
import { COMMAND_BAR_CLASS } from './CommandBarElements.js';
import type { CommandRow, RowIcon } from './CommandRow.js';
import { MiddleEllipsis } from './MiddleEllipsis.js';

export const HOST_MAX_CHARS = 22;
export const ROW_ATTRIBUTE = 'data-index';
export const LETTER_CLASS = `${COMMAND_BAR_CLASS}-letter`;

const ROW_ICON_SIZE = '14';
const GLOBE_SHAPES: IconShapes = [
  ['circle', { cx: '12', cy: '12', r: '9' }],
  ['path', { d: 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' }],
];
const SYMBOLS: Record<Exclude<RowIcon, 'favicon'>, IconShapes> = { search: SEARCH_SHAPES, globe: GLOBE_SHAPES };

export class CommandRowView {
  /**
   * Makes the element of a row: an icon, the title and, after a dash, the host cut in the middle when
   * it is long. A title that is too long is cut at its end by the style sheet.
   *
   * @param document The document of the main window.
   * @param row What the row shows.
   * @param index Its place in the list.
   * @returns The row element, selected or not.
   */
  public static create(document: Document, row: CommandRow, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = `${COMMAND_BAR_CLASS}-row`;
    element.setAttribute('role', 'option');
    element.setAttribute(ROW_ATTRIBUTE, String(index));
    const title = document.createElement('span');
    title.className = `${COMMAND_BAR_CLASS}-title`;
    title.textContent = row.title;
    element.append(CommandRowView.#icon(document, row), title);
    if (row.host !== '') {
      const host = document.createElement('span');
      host.className = `${COMMAND_BAR_CLASS}-host`;
      host.textContent = `— ${MiddleEllipsis.of(row.host, HOST_MAX_CHARS)}`;
      element.append(host);
    }
    return element;
  }

  static #icon(document: Document, row: CommandRow): HTMLElement | SVGElement {
    const className = `${COMMAND_BAR_CLASS}-icon`;
    if (row.icon === 'favicon') {
      return LinkIcon.create(document, { url: row.url, title: row.title }, className, row.favicon);
    }
    const tile = document.createElement('span');
    tile.className = className;
    tile.append(svgIcon(document, SYMBOLS[row.icon], { size: ROW_ICON_SIZE, stroke: '2.2' }));
    return tile;
  }
}
