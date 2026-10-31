export const INCOGNITO_HEADER_ATTRIBUTE = 'data-vivarcdi-incognito-header';

export class IncognitoHeader {
  #element: HTMLElement;

  /**
   * The title of the private tab list, `Incognito Tabs`, with a `Clear` button on its right that
   * shows when the pointer rests on the row.
   *
   * @param document The browser window document.
   * @param onClear What a click on `Clear` does.
   */
  constructor(document: Document, onClear: () => void) {
    const title = document.createElement('span');
    title.className = 'vivarcdi-incognito-title';
    title.textContent = 'Incognito Tabs';
    const clear = document.createElement('button');
    clear.setAttribute('type', 'button');
    clear.setAttribute('title', 'Close all private tabs but the active one');
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => onClear());
    this.#element = document.createElement('div');
    this.#element.setAttribute(INCOGNITO_HEADER_ATTRIBUTE, '');
    this.#element.style.setProperty('-webkit-app-region', 'no-drag');
    this.#element.append(title, clear);
  }

  /**
   * @returns The element to put in the tab bar.
   */
  public get element(): HTMLElement {
    return this.#element;
  }
}
