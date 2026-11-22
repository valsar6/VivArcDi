export interface EditTarget {
  /** The element the field covers (the title of a row) or sits under (a tile). */
  anchor: HTMLElement;
  /** True over the title of a row, false under an icon-only tile. */
  covers: boolean;
}

export interface InPlaceEditorDependencies {
  document: Document;
  parent: () => Element;
}

export interface EditOptions {
  target: EditTarget;
  value: string;
  label: string;
}

export const EDITOR_ATTRIBUTE = 'data-vivarcdi-inline-editor';

export const ROWS_DRAWN_EVENT = 'vivarcdi:rows-drawn';

/**
 * Tells an open field that the rows or the tiles were drawn again.
 *
 * @param document The document of Vivaldi's browser window.
 */
export function notifyRowsDrawn(document: Document): void {
  document.dispatchEvent(new Event(ROWS_DRAWN_EVENT));
}

const TILE_FIELD_WIDTH = 160;
const TILE_FIELD_GAP = 4;
const TILE_FIELD_HEIGHT = 24;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Open {
  input: HTMLInputElement;
  target: EditTarget;
  settle: (text: string | null) => void;
}

export class InPlaceEditor {
  #document: Document;
  #parent: () => Element;
  #open: Open | null = null;
  #onRowsDrawn = (): void => this.reposition();

  /**
   * A small floating text field over a row title or under a tile. It lives in the browser window, not
   * in the rows, so drawing the rows again does not remove it.
   *
   * @param deps The window document and the element the field is added to.
   */
  constructor(deps: InPlaceEditorDependencies) {
    this.#document = deps.document;
    this.#parent = deps.parent;
  }

  /**
   * Opens the field, focused with its text selected. A field that is already open is cancelled.
   *
   * @param options Where the field goes, the text it starts with and its accessible name.
   * @returns The trimmed text on Enter or a click elsewhere ('' when emptied), null on Escape or cancel.
   */
  public edit(options: EditOptions): Promise<string | null> {
    this.cancel();
    return new Promise((resolve) => {
      const input = this.#document.createElement('input');
      input.setAttribute('type', 'text');
      input.setAttribute('aria-label', options.label);
      input.setAttribute(EDITOR_ATTRIBUTE, options.target.covers ? 'covers' : 'below');
      input.style.setProperty('-webkit-app-region', 'no-drag');
      input.value = options.value;
      const open: Open = {
        input,
        target: options.target,
        settle: (text) => {
          if (this.#open !== open) {
            return;
          }
          this.#open = null;
          this.#document.removeEventListener(ROWS_DRAWN_EVENT, this.#onRowsDrawn);
          input.remove();
          resolve(text);
        },
      };
      input.addEventListener('keydown', (event) => this.#key(event, open));
      input.addEventListener('blur', () => open.settle(input.value.trim()));
      this.#open = open;
      this.#document.addEventListener(ROWS_DRAWN_EVENT, this.#onRowsDrawn);
      this.#place(open);
      this.#parent().append(input);
      input.focus();
      input.select();
    });
  }

  /**
   * Puts the field back on its anchor after the rows were drawn again; cancels when the anchor is gone.
   */
  public reposition(): void {
    if (this.#open === null) {
      return;
    }
    if (!this.#open.target.anchor.isConnected) {
      this.cancel();
      return;
    }
    this.#place(this.#open);
  }

  /**
   * Closes the field, if any, without a text.
   */
  public cancel(): void {
    this.#open?.settle(null);
  }

  #key(event: KeyboardEvent, open: Open): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      open.settle(open.input.value.trim());
    } else if (event.key === 'Escape') {
      event.preventDefault();
      open.settle(null);
    }
  }

  #place(open: Open): void {
    const { anchor, covers } = open.target;
    const rect = anchor.getBoundingClientRect();
    const style = open.input.style;
    const box = covers ? this.#coverBox(rect) : this.#tileBox(rect);
    style.setProperty('left', `${box.left}px`);
    style.setProperty('top', `${box.top}px`);
    style.setProperty('width', `${box.width}px`);
    style.setProperty('height', `${box.height}px`);
    if (covers) {
      style.setProperty('font', this.#document.defaultView?.getComputedStyle(anchor).font ?? 'inherit');
    }
  }

  #coverBox(rect: DOMRect): Box {
    return { left: rect.left, top: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top };
  }

  #tileBox(rect: DOMRect): Box {
    const middle = rect.left + (rect.right - rect.left) / 2;
    return { left: Math.max(0, middle - TILE_FIELD_WIDTH / 2), top: rect.bottom + TILE_FIELD_GAP, width: TILE_FIELD_WIDTH, height: TILE_FIELD_HEIGHT };
  }
}
