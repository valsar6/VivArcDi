import { ArchiveList } from './ArchiveList.js';
import { ArchiveSession } from './ArchiveSession.js';
import type { ArchiveEntry } from './ArchiveStore.js';

export interface ArchivePanelHandlers {
  onRestore: (entry: ArchiveEntry) => void;
  onArchiveToday: () => void;
  onClose: () => void;
}

export const ARCHIVE_ATTRIBUTE = 'data-vivarcdi-archive';
export const ARCHIVE_FOOTER_ATTRIBUTE = 'data-vivarcdi-archive-footer';

const INSIDE = `[${ARCHIVE_ATTRIBUTE}], [${ARCHIVE_FOOTER_ATTRIBUTE}]`;
const ARCHIVE_TODAY_ATTRIBUTE = 'data-vivarcdi-archive-today';
const EDGE_GAP = 8;
const STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

export class ArchivePanelView {
  #document: Document;
  #parent: HTMLElement;
  #handlers: ArchivePanelHandlers;
  #list: ArchiveList;
  #panel: HTMLElement | null = null;
  #session: ArchiveSession | null = null;
  #onOutside = (event: Event): void => {
    if ((event.target as Element | null)?.closest?.(INSIDE) == null) {
      this.#handlers.onClose();
    }
  };

  /**
   * The archive panel: a header with "Archive Today tabs", a search field with the focus, and the
   * entries grouped by day. Up and Down move the highlight, Enter restores, Escape and a click
   * outside close. Key presses in the panel stop here, so Vivaldi's shortcuts do not see them.
   *
   * @param document The browser window document.
   * @param parent The element the panel is added to.
   * @param handlers What a chosen entry, the header action and a close request do.
   * @param locale A language tag for dates and times, such as `en-US`.
   */
  constructor(document: Document, parent: HTMLElement, handlers: ArchivePanelHandlers, locale: string) {
    this.#document = document;
    this.#parent = parent;
    this.#handlers = handlers;
    this.#list = new ArchiveList(document, locale, (position) => this.#restore(position));
  }

  /**
   * @returns Whether the panel is on screen.
   */
  public get isOpen(): boolean {
    return this.#panel !== null;
  }

  /**
   * Shows the panel over the tab bar, replacing any panel already open, and focuses its search.
   *
   * @param entries Every archive entry, newest first.
   * @param bar Where the tab bar is.
   */
  public open(entries: readonly ArchiveEntry[], bar: DOMRect): void {
    this.close();
    this.#session = new ArchiveSession(entries);
    const input = this.#input();
    const panel = this.#document.createElement('div');
    panel.setAttribute(ARCHIVE_ATTRIBUTE, '');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Archive');
    panel.addEventListener('keydown', (event) => this.#key(event));
    panel.append(this.#header(), input, this.#list.element);
    this.#parent.append(panel);
    this.#panel = panel;
    this.#render();
    this.#place(panel, bar);
    this.#document.addEventListener('mousedown', this.#onOutside, true);
    input.focus();
  }

  /**
   * Shows new entries in the open panel, keeping what was typed.
   *
   * @param entries Every archive entry, newest first.
   */
  public refresh(entries: readonly ArchiveEntry[]): void {
    this.#session?.reset(entries);
    this.#render();
  }

  /**
   * Removes the panel, if any.
   */
  public close(): void {
    this.#document.removeEventListener('mousedown', this.#onOutside, true);
    this.#panel?.remove();
    this.#panel = null;
    this.#session = null;
  }

  #header(): HTMLElement {
    const header = this.#document.createElement('div');
    header.className = 'vivarcdi-archive-header';
    const heading = this.#document.createElement('span');
    heading.className = 'vivarcdi-archive-heading';
    heading.textContent = 'Archive';
    const action = this.#document.createElement('button');
    action.setAttribute('type', 'button');
    action.setAttribute(ARCHIVE_TODAY_ATTRIBUTE, '');
    action.textContent = 'Archive Today tabs';
    action.addEventListener('click', () => this.#handlers.onArchiveToday());
    header.append(heading, action);
    return header;
  }

  #input(): HTMLInputElement {
    const input = this.#document.createElement('input');
    input.setAttribute('type', 'search');
    input.setAttribute('placeholder', 'Search the archive…');
    input.addEventListener('input', () => {
      this.#session?.setQuery(input.value);
      this.#render();
    });
    return input;
  }

  #render(): void {
    if (this.#session !== null) {
      this.#list.render(this.#session, new Date());
    }
  }

  #restore(position: number): void {
    const entry = this.#session?.chosen(position) ?? null;
    if (entry !== null) {
      this.#handlers.onRestore(entry);
    }
  }

  #key(event: KeyboardEvent): void {
    event.stopPropagation();
    const step = STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      this.#session?.move(step);
      this.#render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.#restore(this.#session?.highlighted ?? -1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.#handlers.onClose();
    }
  }

  #place(panel: HTMLElement, bar: DOMRect): void {
    const view = this.#document.defaultView;
    const width = view?.innerWidth ?? bar.right;
    const onRight = bar.left > width / 2;
    panel.style.setProperty('bottom', `${Math.max(EDGE_GAP, (view?.innerHeight ?? bar.bottom) - bar.bottom + EDGE_GAP)}px`);
    panel.style.setProperty(onRight ? 'right' : 'left', `${(onRight ? width - bar.right : bar.left) + EDGE_GAP}px`);
  }
}
