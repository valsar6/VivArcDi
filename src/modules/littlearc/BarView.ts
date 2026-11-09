import type { KeepLabelParts } from './KeepLabel.js';

export const BAR_CLASS = 'vivarcdi-little-arc-bar';
export const PLACEHOLDER = 'Search or Enter URL…';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ICON_SIZE = '14';
const ICON_VIEWBOX = '0 0 24 24';
const SEARCH_SHAPES: ReadonlyArray<readonly [string, Record<string, string>]> = [
  ['circle', { cx: '11', cy: '11', r: '7' }],
  ['path', { d: 'M20 20l-3.5-3.5' }],
];
const BACK_SHAPES: ReadonlyArray<readonly [string, Record<string, string>]> = [['path', { d: 'M15 6l-6 6 6 6' }]];

export class BarView {
  public readonly root: HTMLElement;
  public readonly back: HTMLButtonElement;
  public readonly field: HTMLInputElement;
  public readonly keep: HTMLButtonElement;
  #prefix: HTMLElement;
  #name: HTMLElement;
  #shortcut: HTMLElement;

  /**
   * The elements of the bar, left to right: the space of the window buttons, back, the address pill
   * and the Open in button. It holds no behavior; `LittleArcBar` listens to it.
   *
   * @param document The document of the popup.
   */
  constructor(document: Document) {
    this.root = BarView.#element(document, 'div', BAR_CLASS);
    const inset = BarView.#element(document, 'span', `${BAR_CLASS}-inset`);
    this.back = BarView.#button(document, `${BAR_CLASS}-back`, 'Back');
    this.back.append(BarView.#icon(document, BACK_SHAPES, '2.4'));
    this.back.hidden = true;
    this.field = BarView.#field(document);
    const pill = BarView.#element(document, 'label', `${BAR_CLASS}-pill`);
    pill.append(BarView.#icon(document, SEARCH_SHAPES, '2.2'), this.field);
    this.keep = BarView.#button(document, `${BAR_CLASS}-keep`, 'Open in workspace');
    this.#prefix = document.createElement('span');
    this.#name = document.createElement('strong');
    this.#shortcut = document.createElement('kbd');
    this.keep.append(this.#prefix, this.#name, this.#shortcut);
    this.root.append(inset, this.back, pill, this.keep);
  }

  /**
   * @param label The words of the Open in button.
   */
  public showLabel(label: KeepLabelParts): void {
    this.#prefix.textContent = label.prefix;
    this.#name.textContent = label.name;
    this.#shortcut.textContent = label.shortcut;
    this.keep.setAttribute('aria-label', `${label.prefix} ${label.name}`);
  }

  static #element(document: Document, tag: string, className: string): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  static #button(document: Document, className: string, label: string): HTMLButtonElement {
    const button = BarView.#element(document, 'button', className) as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-label', label);
    return button;
  }

  static #field(document: Document): HTMLInputElement {
    const field = document.createElement('input');
    field.type = 'text';
    field.placeholder = PLACEHOLDER;
    field.spellcheck = false;
    field.setAttribute('aria-label', 'Search or enter address');
    return field;
  }

  static #icon(document: Document, shapes: ReadonlyArray<readonly [string, Record<string, string>]>, stroke: string): SVGElement {
    const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
    const attributes = { width: ICON_SIZE, height: ICON_SIZE, viewBox: ICON_VIEWBOX, fill: 'none', stroke: 'currentColor', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.entries(attributes).forEach(([name, value]) => icon.setAttribute(name, value));
    for (const [tag, shape] of shapes) {
      const part = document.createElementNS(SVG_NAMESPACE, tag);
      Object.entries(shape).forEach(([name, value]) => part.setAttribute(name, value));
      icon.append(part);
    }
    return icon;
  }
}
