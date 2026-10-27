import type { Row } from './FolderRows.js';
import { LinkIcon } from './LinkIcon.js';

export interface SectionHandlers {
  onFolder: (folderId: string) => void;
  onLink: (link: { url: string; key: string }) => void;
}

const ICON_CLASS = 'vivarcdi-folders-icon';
const LETTER_CLASS = 'vivarcdi-folders-icon vivarcdi-folders-letter';
const ROW_ATTRIBUTES = ['data-vivarcdi-folder-id', 'data-vivarcdi-link-id'] as const;

export class FolderSectionView {
  #document: Document;
  #handlers: SectionHandlers;
  #element: HTMLElement;
  #links = new Map<string, { url: string; key: string }>();

  /**
   * Draws the rows of the section with plain DOM calls and handles every click with one listener.
   * It reads nothing from the bookmarks and changes none.
   *
   * @param document The browser window document.
   * @param handlers What a click on a folder row and on a link row does.
   * @param maxHeightPercent The most the section may take of the window's height before it scrolls.
   */
  constructor(document: Document, handlers: SectionHandlers, maxHeightPercent: number) {
    this.#document = document;
    this.#handlers = handlers;
    this.#element = document.createElement('div');
    this.#element.setAttribute('data-vivarcdi-folders', '');
    this.#element.style.setProperty('--vivarcdi-folders-max-height', String(maxHeightPercent));
    this.#element.addEventListener('click', (event) => this.#click(event));
    this.#element.addEventListener('error', (event) => LinkIcon.fallback(event, LETTER_CLASS), true);
  }

  /**
   * @returns The element to put in the tab bar.
   */
  public get element(): HTMLElement {
    return this.#element;
  }

  /**
   * Replaces the rows. An empty list hides the section.
   *
   * @param rows What to show.
   */
  public render(rows: Row[]): void {
    this.#links.clear();
    this.#element.replaceChildren(...rows.map((row) => this.#row(row)));
    this.#element.toggleAttribute('hidden', rows.length === 0);
  }

  /**
   * Removes the section from the document.
   */
  public remove(): void {
    this.#element.remove();
  }

  #row(row: Row): HTMLElement {
    const element = this.#document.createElement('div');
    element.setAttribute('role', row.kind === 'folder' ? 'treeitem' : 'link');
    element.setAttribute('title', row.title);
    element.style.setProperty('--vivarcdi-depth', String(row.depth));
    const label = this.#document.createElement('span');
    label.className = 'vivarcdi-folders-title';
    label.textContent = row.title;
    if (row.kind === 'folder') {
      element.setAttribute('data-vivarcdi-folder-id', row.id);
      element.toggleAttribute('data-vivarcdi-open', row.open);
      element.setAttribute('aria-expanded', String(row.open));
      element.append(this.#folderIcon(), label);
    } else {
      this.#links.set(row.id, { url: row.url, key: row.key });
      element.setAttribute('data-vivarcdi-link-id', row.id);
      element.toggleAttribute('data-vivarcdi-link-open', row.tab !== undefined);
      element.append(this.#linkIcon(row), label);
    }
    return element;
  }

  #folderIcon(): HTMLElement {
    const icon = this.#document.createElement('span');
    icon.className = 'vivarcdi-folders-folder-icon';
    return icon;
  }

  #linkIcon(row: Extract<Row, { kind: 'link' }>): HTMLElement {
    return LinkIcon.create(this.#document, row, ICON_CLASS, row.tab?.favIconUrl);
  }

  #click(event: Event): void {
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>(ROW_ATTRIBUTES.map((name) => `[${name}]`).join(','));
    if (row === null || row === undefined) {
      return;
    }
    const folderId = row.getAttribute('data-vivarcdi-folder-id');
    if (folderId !== null) {
      this.#handlers.onFolder(folderId);
      return;
    }
    const link = this.#links.get(row.getAttribute('data-vivarcdi-link-id') ?? '');
    if (link !== undefined) {
      this.#handlers.onLink(link);
    }
  }
}
