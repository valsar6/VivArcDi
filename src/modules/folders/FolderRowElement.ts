import type { FolderNameEditor } from './FolderNameEditor.js';
import type { FolderRow, LinkRow, Row } from './FolderRows.js';
import { LinkIcon } from './LinkIcon.js';

export const CLOSE_ATTRIBUTE = 'data-vivarcdi-link-close';
export const LIVE_FOLDER_ATTRIBUTE = 'data-vivarcdi-live-folder';
export const LIVE_WARNING_ATTRIBUTE = 'data-vivarcdi-live-warning';
export const ICON_CLASS = 'vivarcdi-folders-icon';

const CLOSE_LABEL = 'Close tab';
const SUBTITLE_ATTRIBUTE = 'data-vivarcdi-link-subtitle';

export class FolderRowElement {
  #document: Document;
  #editor: Pick<FolderNameEditor, 'isEditing' | 'field'>;

  /**
   * Builds the element of a row with plain DOM calls. A folder row has its icon (the pull-request
   * icon for a live folder), its name or the field that edits it, and the warning mark of a live
   * folder whose refresh failed. A link row has its icon, its title with the subtitle under it
   * when it has one, and the close button when its tab is open.
   *
   * @param document The browser window document.
   * @param editor The field that replaces the name of the folder being edited.
   */
  constructor(document: Document, editor: Pick<FolderNameEditor, 'isEditing' | 'field'>) {
    this.#document = document;
    this.#editor = editor;
  }

  /**
   * @param row What to draw.
   * @returns The element of the row.
   */
  public create(row: Row): HTMLElement {
    const element = this.#document.createElement('div');
    element.setAttribute('role', row.kind === 'folder' ? 'treeitem' : 'link');
    element.setAttribute('title', row.kind === 'link' && row.subtitle !== undefined ? `${row.title}\n${row.subtitle}` : row.title);
    element.style.setProperty('--vivarcdi-depth', String(row.depth));
    element.setAttribute('data-vivarcdi-depth', String(row.depth));
    if (row.kind === 'folder') {
      this.#fillFolder(element, row);
    } else {
      this.#fillLink(element, row);
    }
    return element;
  }

  #fillFolder(element: HTMLElement, row: FolderRow): void {
    element.setAttribute('data-vivarcdi-folder-id', row.id);
    element.toggleAttribute('data-vivarcdi-open', row.open);
    element.setAttribute('aria-expanded', String(row.open));
    element.toggleAttribute(LIVE_FOLDER_ATTRIBUTE, row.live === true);
    const name = this.#editor.isEditing(row.id) ? this.#editor.field() : this.#title(row.title);
    element.append(this.#folderIcon(row.live === true), name, ...(row.warning === undefined ? [] : [this.#warningMark(row.warning)]));
  }

  #fillLink(element: HTMLElement, row: LinkRow): void {
    element.setAttribute('data-vivarcdi-link-id', row.id);
    element.toggleAttribute('data-vivarcdi-link-open', row.tab !== undefined);
    element.toggleAttribute('data-vivarcdi-link-active', row.tab?.active === true);
    element.toggleAttribute('data-vivarcdi-link-unloaded', row.tab?.unloaded === true);
    element.toggleAttribute(SUBTITLE_ATTRIBUTE, row.subtitle !== undefined);
    const title = this.#title(row.title);
    const text = row.subtitle === undefined ? title : this.#twoLines(title, row.subtitle);
    element.append(LinkIcon.create(this.#document, row, ICON_CLASS, row.tab?.favIconUrl), text, ...(row.tab === undefined ? [] : [this.#closeButton()]));
  }

  #title(text: string): HTMLElement {
    const label = this.#document.createElement('span');
    label.className = 'vivarcdi-folders-title';
    label.textContent = text;
    return label;
  }

  #folderIcon(live: boolean): HTMLElement {
    const icon = this.#document.createElement('span');
    icon.className = live ? 'vivarcdi-folders-live-icon' : 'vivarcdi-folders-folder-icon';
    return icon;
  }

  #warningMark(reason: string): HTMLElement {
    const mark = this.#document.createElement('span');
    mark.className = 'vivarcdi-folders-live-warning';
    mark.setAttribute(LIVE_WARNING_ATTRIBUTE, '');
    mark.setAttribute('title', reason);
    mark.setAttribute('aria-label', reason);
    return mark;
  }

  #twoLines(title: HTMLElement, subtitle: string): HTMLElement {
    const lines = this.#document.createElement('span');
    lines.className = 'vivarcdi-folders-lines';
    const second = this.#document.createElement('span');
    second.className = 'vivarcdi-folders-subtitle';
    second.textContent = subtitle;
    lines.append(title, second);
    return lines;
  }

  #closeButton(): HTMLElement {
    const button = this.#document.createElement('span');
    button.className = 'vivarcdi-folders-close';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', CLOSE_LABEL);
    button.setAttribute(CLOSE_ATTRIBUTE, '');
    return button;
  }
}
