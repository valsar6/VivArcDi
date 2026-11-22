export type PickerTab = 'emoji' | 'icons';

/** The icon a label shows: an emoji, or the id of one of the symbols. */
export type PickedIcon = { emoji: string } | { symbol: string };

export type PickResult = { icon: PickedIcon } | { reset: true } | { refresh: true };

export interface PickerEmoji {
  emoji: string;
  name: string;
}

/** The emoji data the picker draws; `EmojiCatalog` satisfies it. */
export interface PickerCatalog {
  categories(): ReadonlyArray<{ id: string; label: string; emoji: readonly PickerEmoji[] }>;
  search(text: string): readonly PickerEmoji[];
}

export interface IconPickerDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that receives the popover, such as `#browser`. */
  parent: () => Element;
  /** Loads the emoji data, the first time the emoji tab is drawn. */
  catalog: () => Promise<PickerCatalog>;
  /** The symbols of the `Icons` tab. */
  symbols: ReadonlyArray<{ id: string; label: string; path: string }>;
}

export interface PickOptions {
  /** The element the popover opens beside. */
  anchor: HTMLElement;
  /** The tabs to show; both when absent. */
  tabs?: readonly PickerTab[];
  /** Shows the Refresh favicon button. */
  refresh?: boolean;
}

export const PICKER_ATTRIBUTE = 'data-vivarcdi-picker';
export const TAB_ATTRIBUTE = 'data-vivarcdi-picker-tab';
export const SEARCH_ATTRIBUTE = 'data-vivarcdi-picker-search';
export const CELL_ATTRIBUTE = 'data-vivarcdi-picker-cell';
export const CATEGORY_ATTRIBUTE = 'data-vivarcdi-picker-category';
export const RESET_ATTRIBUTE = 'data-vivarcdi-picker-reset';
export const REFRESH_ATTRIBUTE = 'data-vivarcdi-picker-refresh';

const ALL_TABS: readonly PickerTab[] = ['emoji', 'icons'];
const TAB_LABELS: Record<PickerTab, string> = { emoji: 'Emoji', icons: 'Icons' };
const EDGE_PX = 4;
const SVG_ATTRIBUTES = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

type Choose = (result: PickResult) => void;

interface EmojiBody { element: HTMLElement; search: HTMLInputElement; showCategories: () => void }

function make(document: Document, tag: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function button(document: Document, label: string, attributes: Record<string, string>, onClick: () => void): HTMLElement {
  const element = make(document, 'button', { type: 'button', 'aria-label': label, ...attributes });
  element.addEventListener('click', onClick);
  return element;
}

function symbolGlyph(document: Document, path: string): Element {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const shape = document.createElementNS(SVG_NAMESPACE, 'path');
  shape.setAttribute('d', path);
  Object.entries(SVG_ATTRIBUTES).forEach(([name, value]) => svg.setAttribute(name, value));
  svg.append(shape);
  return svg;
}

function emojiCell(document: Document, { emoji, name }: PickerEmoji, choose: Choose): HTMLElement {
  return Object.assign(button(document, name, { [CELL_ATTRIBUTE]: emoji }, () => choose({ icon: { emoji } })), { textContent: emoji });
}

function emojiBody(document: Document, catalog: PickerCatalog, choose: Choose): EmojiBody {
  const element = make(document, 'div');
  const search = make(document, 'input', { type: 'search', placeholder: 'Search', [SEARCH_ATTRIBUTE]: '' }) as HTMLInputElement;
  const grid = make(document, 'div');
  const bar = make(document, 'div');
  const sections = catalog.categories().map((category) => {
    const section = make(document, 'div');
    section.append(...category.emoji.map((entry) => emojiCell(document, entry, choose)));
    const mark = button(document, category.label, { [CATEGORY_ATTRIBUTE]: category.id }, () => (grid.scrollTop = section.offsetTop));
    bar.append(Object.assign(mark, { textContent: category.emoji[0]?.emoji ?? '' }));
    return section;
  });
  const showCategories = (): void => {
    search.value = '';
    grid.replaceChildren(...sections);
    grid.scrollTop = 0;
  };
  search.addEventListener('input', () => {
    const text = search.value.trim();
    return text === '' ? showCategories() : grid.replaceChildren(...catalog.search(text).map((entry) => emojiCell(document, entry, choose)));
  });
  element.append(search, grid, bar);
  showCategories();
  return { element, search, showCategories };
}

export class IconPicker {
  #deps: IconPickerDependencies;
  #popover: HTMLElement | null = null;
  #settle: ((result: PickResult | null) => void) | null = null;
  #cache: Promise<EmojiBody | null> | null = null;
  #choose: Choose = (result) => this.#finish(result);
  #onKey = (event: Event): void => {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  };
  #onPress = (event: Event): void => {
    if ((event.target as Element | null)?.closest?.(`[${PICKER_ATTRIBUTE}]`) == null) {
      this.close();
    }
  };

  /**
   * The popover that lets the user choose an emoji or a symbol for a link, reset it or read its
   * favicon again. It is drawn beside an anchor, outside the window drag region, and closes on
   * Escape and on a click elsewhere. The 1,400 emoji buttons are drawn once and reused.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: IconPickerDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Opens the picker beside an anchor, closing the one that is open.
   *
   * @param options The anchor, the tabs to show and whether the favicon can be refreshed.
   * @returns The choice, or null on Escape, on a click elsewhere or when it is closed.
   */
  public pick(options: PickOptions): Promise<PickResult | null> {
    this.close();
    return new Promise((resolve) => {
      this.#settle = resolve;
      this.#open(options);
    });
  }

  /**
   * Closes the picker without a choice, if it is open.
   */
  public close(): void {
    this.#finish(null);
  }

  #finish(result: PickResult | null): void {
    const { document } = this.#deps;
    const settle = this.#settle;
    document.removeEventListener('keydown', this.#onKey, true);
    document.removeEventListener('mousedown', this.#onPress, true);
    this.#popover?.remove();
    this.#popover = null;
    this.#settle = null;
    settle?.(result);
  }

  #open({ anchor, tabs = ALL_TABS, refresh = false }: PickOptions): void {
    const { document } = this.#deps;
    const popover = make(document, 'div', { [PICKER_ATTRIBUTE]: '', role: 'dialog' });
    const panes = new Map<PickerTab, HTMLElement>(tabs.map((name) => [name, make(document, 'div')]));
    const show = (shown: PickerTab): void => {
      panes.forEach((pane, name) => pane.toggleAttribute('hidden', name !== shown));
      if (shown === 'emoji') {
        void this.#cache?.then((body) => body?.search.focus());
      }
    };
    popover.append(this.#header(tabs, refresh, show), ...panes.values());
    popover.style.setProperty('-webkit-app-region', 'no-drag');
    this.#deps.parent().append(popover);
    this.#popover = popover;
    this.#place(popover, anchor);
    document.addEventListener('keydown', this.#onKey, true);
    document.addEventListener('mousedown', this.#onPress, true);
    panes.get('icons')?.append(...this.#symbolCells());
    const emoji = panes.get('emoji');
    if (emoji !== undefined) {
      void this.#drawEmoji(popover, emoji);
    }
    show(tabs[0] ?? 'emoji');
  }

  #header(tabs: readonly PickerTab[], refresh: boolean, show: (tab: PickerTab) => void): HTMLElement {
    const { document } = this.#deps;
    const header = make(document, 'div');
    header.append(...tabs.map((name) => Object.assign(button(document, TAB_LABELS[name], { [TAB_ATTRIBUTE]: name }, () => show(name)), { textContent: TAB_LABELS[name] })));
    if (refresh) {
      header.append(button(document, 'Refresh favicon', { [REFRESH_ATTRIBUTE]: '' }, () => this.#choose({ refresh: true })));
    }
    header.append(button(document, 'Reset', { [RESET_ATTRIBUTE]: '' }, () => this.#choose({ reset: true })));
    return header;
  }

  #symbolCells(): HTMLElement[] {
    const { document, symbols } = this.#deps;
    return symbols.map(({ id, label, path }) => {
      const cell = button(document, label, { [CELL_ATTRIBUTE]: id }, () => this.#finish({ icon: { symbol: id } }));
      cell.append(symbolGlyph(document, path));
      return cell;
    });
  }

  async #load(): Promise<EmojiBody | null> {
    try {
      const catalog = await this.#deps.catalog();
      return catalog.categories().length === 0 ? null : emojiBody(this.#deps.document, catalog, this.#choose);
    } catch {
      return null;
    }
  }

  async #drawEmoji(popover: HTMLElement, pane: HTMLElement): Promise<void> {
    this.#cache ??= this.#load();
    const body = await this.#cache;
    if (this.#popover !== popover) {
      return;
    }
    if (body === null) {
      pane.textContent = 'Emoji are not available';
      this.#cache = null;
      return;
    }
    body.showCategories();
    pane.append(body.element);
  }

  #place(popover: HTMLElement, anchor: HTMLElement): void {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const side = anchor.getBoundingClientRect();
    const { left, right, top, bottom } = popover.getBoundingClientRect();
    const width = right - left;
    const x = side.right + width <= innerWidth - EDGE_PX ? side.right : side.left - width;
    const y = Math.min(side.top, innerHeight - (bottom - top) - EDGE_PX);
    popover.style.setProperty('left', `${Math.max(EDGE_PX, Math.min(x, innerWidth - width - EDGE_PX))}px`);
    popover.style.setProperty('top', `${Math.max(EDGE_PX, y)}px`);
  }
}
