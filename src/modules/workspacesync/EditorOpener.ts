import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import type { Poll } from './Poll.js';
import type { ReactInternals } from './ReactInternals.js';

export interface EditorOpener {
  /**
   * @param row The row of a workspace in Vivaldi's workspace menu.
   * @returns Whether the inline editor of the workspace is open now.
   */
  openEditor: (row: Element) => Promise<boolean>;
}

const APPEAR_MS = 400;

export class ReactEditorOpener implements EditorOpener {
  #document: Document;
  #selectors: Pick<SelectorCatalog, 'get'>;
  #poll: Pick<Poll, 'until'>;
  #internals: Pick<ReactInternals, 'renameHooks'>;
  #known: number | null = null;

  /**
   * Opens the inline editor of a workspace the way Vivaldi's own "Edit workspace" item does: by
   * setting the state that holds the workspace being renamed. Which of the state hooks of the list
   * that is, is not known, so each candidate is tried with the workspace id until the editor
   * appears; a candidate that does nothing is set back. The one that worked is tried first next time.
   *
   * @param document The document of Vivaldi's browser window.
   * @param selectors Selectors of the menu.
   * @param poll Waits for the editor.
   * @param internals The access to React's internals.
   */
  constructor(document: Document, selectors: Pick<SelectorCatalog, 'get'>, poll: Pick<Poll, 'until'>, internals: Pick<ReactInternals, 'renameHooks'>) {
    this.#document = document;
    this.#selectors = selectors;
    this.#poll = poll;
    this.#internals = internals;
  }

  public async openEditor(row: Element): Promise<boolean> {
    const hooks = this.#internals.renameHooks(row);
    if (hooks === null) {
      return false;
    }
    const order = hooks.starters.map((_, index) => index).sort((left, right) => Number(right === this.#known) - Number(left === this.#known));
    for (const index of order) {
      const start = hooks.starters[index];
      start?.(hooks.workspaceId);
      if (await this.#editorShown()) {
        this.#known = index;
        return true;
      }
      start?.(undefined);
    }
    return false;
  }

  async #editorShown(): Promise<boolean> {
    const selector = this.#selectors.get('workspaceTitle');
    return (await this.#poll.until(() => this.#document.querySelector(selector), APPEAR_MS)) !== null;
  }
}
