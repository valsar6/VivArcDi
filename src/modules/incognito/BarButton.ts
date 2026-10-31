export const BAR_BUTTON_ATTRIBUTE = 'data-vivarcdi-bar-button';

export interface BarButtonSpec {
  /** Names the button, so that a stylesheet can draw its icon: `library` or `plus`. */
  name: string;
  /** What the button does, shown as its tooltip and read by screen readers. */
  title: string;
  /** Text inside the button; empty when the stylesheet draws an icon. */
  text: string;
  /** What a click does. */
  onClick: () => void;
}

export class BarButton {
  #element: HTMLButtonElement;

  /**
   * One round button of the bottom bar.
   *
   * @param document The browser window document.
   * @param spec Its name, label and action.
   */
  constructor(document: Document, { name, title, text, onClick }: BarButtonSpec) {
    this.#element = document.createElement('button');
    this.#element.setAttribute('type', 'button');
    this.#element.setAttribute(BAR_BUTTON_ATTRIBUTE, name);
    this.#element.setAttribute('title', title);
    this.#element.setAttribute('aria-label', title);
    this.#element.textContent = text;
    this.#element.addEventListener('click', () => onClick());
  }

  /**
   * @returns The element to put in the bar.
   */
  public get element(): HTMLElement {
    return this.#element;
  }
}
