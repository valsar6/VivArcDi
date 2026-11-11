import { SEARCH_SHAPES, svgIcon } from '../SvgIcon.js';
import type { IconShapes } from '../SvgIcon.js';

export const COMMAND_BAR_CLASS = 'vivarcdi-command-bar';
export const PLACEHOLDER = 'Search or Enter URL…';

const SEARCH_ICON_SIZE = '22';
const CLOSE_ICON_SIZE = '12';
const CLOSE_SHAPES: IconShapes = [['path', { d: 'M6 6l12 12M18 6L6 18' }]];

export interface CommandBarElements {
  catcher: HTMLElement;
  card: HTMLElement;
  input: HTMLInputElement;
  close: HTMLButtonElement;
  list: HTMLElement;
}

export class CommandBarFactory {
  /**
   * Builds the elements of the command bar, not yet in the page: a transparent layer that covers the
   * window and catches outside clicks, holding the card with the field row (search icon, field and ×
   * button), a divider and the list of rows.
   *
   * @param document The document of the main window.
   * @returns The elements.
   */
  public static create(document: Document): CommandBarElements {
    const catcher = CommandBarFactory.#element(document, 'div', `${COMMAND_BAR_CLASS}-catcher`);
    const card = CommandBarFactory.#element(document, 'div', COMMAND_BAR_CLASS);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Search or enter address');
    const row = CommandBarFactory.#element(document, 'div', `${COMMAND_BAR_CLASS}-field`);
    const input = CommandBarFactory.#input(document);
    const close = CommandBarFactory.#close(document);
    row.append(svgIcon(document, SEARCH_SHAPES, { size: SEARCH_ICON_SIZE, stroke: '2.2' }), input, close);
    const divider = CommandBarFactory.#element(document, 'div', `${COMMAND_BAR_CLASS}-divider`);
    const list = CommandBarFactory.#element(document, 'div', `${COMMAND_BAR_CLASS}-list`);
    list.setAttribute('role', 'listbox');
    card.append(row, divider, list);
    catcher.append(card);
    return { catcher, card, input, close, list };
  }

  static #element(document: Document, tag: string, className: string): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  static #input(document: Document): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = `${COMMAND_BAR_CLASS}-input`;
    input.placeholder = PLACEHOLDER;
    input.spellcheck = false;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', 'Search or enter address');
    return input;
  }

  static #close(document: Document): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${COMMAND_BAR_CLASS}-close`;
    button.setAttribute('aria-label', 'Close');
    button.append(svgIcon(document, CLOSE_SHAPES, { size: CLOSE_ICON_SIZE, stroke: '2.4' }));
    return button;
  }
}
