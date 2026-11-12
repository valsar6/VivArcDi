export const MENU_ATTRIBUTE = 'data-vivarcdi-menu';

/** A command of the menu: its label and what it does; when `checked` is given, a check mark shows whether it is on. */
export interface CommandItem {
  label: string;
  run: () => void;
  checked?: boolean;
}

/** An item that opens a submenu to its side. */
export interface SubmenuItem {
  label: string;
  items: MenuItem[];
}

export type MenuItem = CommandItem | SubmenuItem;

export interface ContextMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that receives the menu, such as `#browser`. */
  parent: () => Element;
}

export const CHECKED_ATTRIBUTE = 'data-vivarcdi-checked';

interface Placement {
  x: number;
  y: number;
  /** The row a submenu opens from; the submenu goes to its other side when there is no room. */
  side?: DOMRect;
}

const EDGE_PX = 4;

export class ContextMenu {
  #deps: ContextMenuDependencies;
  #levels: HTMLElement[] = [];
  #onKey = (event: Event): void => this.#key(event as KeyboardEvent);
  #onPress = (event: Event): void => this.#press(event);

  /**
   * VivArcDi's own menu, drawn at the pointer for the rows and tiles that VivArcDi owns. It stays
   * inside the window, and closes on Escape, on a click elsewhere and after a command. It is
   * outside the window drag region. An item can show a check mark, and an item with items opens
   * a submenu to its side while the pointer is on it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: ContextMenuDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Opens the menu at a point, closing the one that is open.
   *
   * @param items The commands, in order.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public open(items: MenuItem[], x: number, y: number): void {
    this.close();
    const { document } = this.#deps;
    this.#show(items, 0, { x, y });
    document.addEventListener('keydown', this.#onKey, true);
    document.addEventListener('mousedown', this.#onPress, true);
  }

  /**
   * Closes the menu, if it is open.
   */
  public close(): void {
    const { document } = this.#deps;
    document.removeEventListener('keydown', this.#onKey, true);
    document.removeEventListener('mousedown', this.#onPress, true);
    this.#closeAbove(-1);
  }

  #show(items: MenuItem[], level: number, at: Placement): void {
    const element = this.#deps.document.createElement('div');
    element.setAttribute(MENU_ATTRIBUTE, '');
    element.setAttribute('role', 'menu');
    items.forEach((item) => element.append(this.#row(item, level)));
    this.#deps.parent().append(element);
    this.#levels.push(element);
    this.#place(element, at);
  }

  #closeAbove(level: number): void {
    this.#levels.splice(level + 1).forEach((element) => element.remove());
  }

  #row(item: MenuItem, level: number): HTMLElement {
    const row = this.#deps.document.createElement('div');
    row.setAttribute('role', 'menuitem');
    row.textContent = item.label;
    if ('items' in item) {
      this.#submenuRow(row, item, level);
    } else {
      this.#commandRow(row, item, level);
    }
    return row;
  }

  #commandRow(row: HTMLElement, item: CommandItem, level: number): void {
    if (item.checked !== undefined) {
      row.setAttribute('role', 'menuitemcheckbox');
      row.setAttribute('aria-checked', String(item.checked));
      row.toggleAttribute(CHECKED_ATTRIBUTE, item.checked);
    }
    row.addEventListener('mouseenter', () => this.#closeAbove(level));
    row.addEventListener('click', () => {
      this.close();
      item.run();
    });
  }

  #submenuRow(row: HTMLElement, { items }: SubmenuItem, level: number): void {
    row.setAttribute('aria-haspopup', 'menu');
    const open = (): void => {
      this.#closeAbove(level);
      const rect = row.getBoundingClientRect();
      this.#show(items, level + 1, { x: rect.right, y: rect.top, side: rect });
    };
    row.addEventListener('mouseenter', open);
    row.addEventListener('click', open);
  }

  #place(element: HTMLElement, { x, y, side }: Placement): void {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const width = right - left;
    const fitsRight = x + width <= innerWidth - EDGE_PX;
    const beside = side !== undefined && !fitsRight ? side.left - width : x;
    const left0 = Math.min(beside, innerWidth - width - EDGE_PX);
    const top0 = Math.min(y, innerHeight - (bottom - top) - EDGE_PX);
    element.style.setProperty('left', `${Math.max(EDGE_PX, left0)}px`);
    element.style.setProperty('top', `${Math.max(EDGE_PX, top0)}px`);
  }

  #key(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  #press(event: Event): void {
    if ((event.target as Element | null)?.closest?.(`[${MENU_ATTRIBUTE}]`) == null) {
      this.close();
    }
  }
}
