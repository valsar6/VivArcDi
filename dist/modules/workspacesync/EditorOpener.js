const APPEAR_MS = 400;
class ReactEditorOpener {
  #document;
  #selectors;
  #poll;
  #internals;
  #known = null;
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
  constructor(document, selectors, poll, internals) {
    this.#document = document;
    this.#selectors = selectors;
    this.#poll = poll;
    this.#internals = internals;
  }
  async openEditor(row) {
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
      start?.(void 0);
    }
    return false;
  }
  async #editorShown() {
    const selector = this.#selectors.get("workspaceTitle");
    return await this.#poll.until(() => this.#document.querySelector(selector), APPEAR_MS) !== null;
  }
}
export {
  ReactEditorOpener
};
