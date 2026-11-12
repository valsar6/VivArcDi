import { PullRequestFilters } from './PullRequestFilters.js';

export const EDITOR_ATTRIBUTE = 'data-vivarcdi-repository-editor';

export interface RepositoryEditorDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that receives the editor, such as `#browser`. */
  parent: () => Element;
}

const HINT = 'One owner/repo per line. Empty means every repository.';
const SAVE_LABEL = 'Save';
const CANCEL_LABEL = 'Cancel';

export class RepositoryEditor {
  #deps: RepositoryEditorDependencies;
  #element: HTMLElement | null = null;
  #onKey = (event: Event): void => this.#key(event as KeyboardEvent);
  #onPress = (event: Event): void => this.#press(event);

  /**
   * The field where the user types the repositories a live folder is limited to, one `owner/repo`
   * per line, with Save and Cancel. It closes on Escape and on a click elsewhere. Lines that are
   * not `owner/repo` are dropped when it saves.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: RepositoryEditorDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Opens the editor at a point, closing the one that is open.
   *
   * @param x Horizontal position in the window.
   * @param y Vertical position in the window.
   * @param repositories The names the folder is limited to now.
   * @param onSave Called with the valid names the user typed.
   */
  public open(x: number, y: number, repositories: string[], onSave: (repositories: string[]) => void): void {
    this.close();
    const { document } = this.#deps;
    const element = document.createElement('div');
    element.setAttribute(EDITOR_ATTRIBUTE, '');
    element.setAttribute('role', 'dialog');
    element.style.setProperty('left', `${x}px`);
    element.style.setProperty('top', `${y}px`);
    const field = document.createElement('textarea');
    field.setAttribute('aria-label', HINT);
    field.setAttribute('placeholder', 'owner/repo');
    field.value = PullRequestFilters.formatRepositories(repositories);
    const save = this.#button(SAVE_LABEL, () => {
      this.close();
      onSave(PullRequestFilters.parseRepositories(field.value));
    });
    const hint = document.createElement('div');
    hint.textContent = HINT;
    element.append(hint, field, this.#button(CANCEL_LABEL, () => this.close()), save);
    this.#deps.parent().append(element);
    this.#element = element;
    document.addEventListener('keydown', this.#onKey, true);
    document.addEventListener('mousedown', this.#onPress, true);
    field.focus();
  }

  /**
   * Closes the editor, if it is open.
   */
  public close(): void {
    const { document } = this.#deps;
    document.removeEventListener('keydown', this.#onKey, true);
    document.removeEventListener('mousedown', this.#onPress, true);
    this.#element?.remove();
    this.#element = null;
  }

  #button(label: string, run: () => void): HTMLElement {
    const button = this.#deps.document.createElement('button');
    button.setAttribute('type', 'button');
    button.textContent = label;
    button.addEventListener('click', run);
    return button;
  }

  #key(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  #press(event: Event): void {
    if ((event.target as Element | null)?.closest?.(`[${EDITOR_ATTRIBUTE}]`) == null) {
      this.close();
    }
  }
}
