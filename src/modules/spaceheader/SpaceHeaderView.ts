import type { SpaceIconView } from './SpaceIcon.js';

export interface SpaceHeaderState {
  /** The name to show. */
  name: string;
  /** The icon to show, or null for none. */
  icon: SpaceIconView | null;
  /** Whether the workspace is collapsed. */
  collapsed: boolean;
}

const HEADER_ATTRIBUTE = 'data-vivarcdi-space-header';
const COLLAPSED_ATTRIBUTE = 'data-vivarcdi-collapsed';

export class SpaceHeaderView {
  #document: Document;
  #element: HTMLElement;

  /**
   * The row above the folders: an arrow, the icon and the name of the workspace. A click anywhere
   * on it calls the handler; the view keeps no state of its own.
   *
   * @param document The browser window document.
   * @param onToggle Called when the row is clicked.
   */
  constructor(document: Document, onToggle: () => void) {
    this.#document = document;
    this.#element = document.createElement('div');
    this.#element.setAttribute(HEADER_ATTRIBUTE, '');
    this.#element.setAttribute('role', 'button');
    this.#element.style.setProperty('-webkit-app-region', 'no-drag');
    this.#element.addEventListener('click', () => onToggle());
  }

  /**
   * @returns The element to put in the tab bar.
   */
  public get element(): HTMLElement {
    return this.#element;
  }

  /**
   * Replaces the content of the row.
   *
   * @param state What to show.
   */
  public render({ name, icon, collapsed }: SpaceHeaderState): void {
    this.#element.toggleAttribute(COLLAPSED_ATTRIBUTE, collapsed);
    this.#element.setAttribute('aria-expanded', String(!collapsed));
    this.#element.setAttribute('title', name);
    this.#element.replaceChildren(this.#part('vivarcdi-space-arrow', ''), ...(icon === null ? [] : [this.#icon(icon)]), this.#part('vivarcdi-space-name', name));
  }

  /**
   * Removes the row from the document.
   */
  public remove(): void {
    this.#element.remove();
  }

  #icon({ kind, text }: SpaceIconView): HTMLElement {
    return this.#part(kind === 'letter' ? 'vivarcdi-space-icon vivarcdi-space-letter' : 'vivarcdi-space-icon', text);
  }

  #part(className: string, text: string): HTMLElement {
    const part = this.#document.createElement('span');
    part.className = className;
    part.textContent = text;
    return part;
  }
}
