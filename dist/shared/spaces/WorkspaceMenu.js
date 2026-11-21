const APPEAR_MS = 1e3;
const SAVE_BUTTON_MS = 300;
class WorkspaceMenu {
  #document;
  #selectors;
  #gestures;
  #poll;
  #editor;
  /**
   * Vivaldi's own workspace menu, driven step by step. Every step throws an error when the part of
   * the interface it needs is not there, so the caller can stop and close the menu.
   *
   * @param document The document of Vivaldi's browser window.
   * @param selectors Selectors of the menu.
   * @param tools How to press, write and close, how to wait for the menu to draw itself, and how to open the inline editor of a workspace row.
   */
  constructor(document, selectors, tools) {
    this.#document = document;
    this.#selectors = selectors;
    this.#gestures = tools.gestures;
    this.#poll = tools.poll;
    this.#editor = tools.editor;
  }
  /**
   * Opens the menu from the workspace button.
   */
  async open() {
    this.#gestures.click(await this.#appear("workspaceMenuButton"));
    await this.#appear("workspacePopup");
  }
  /**
   * Presses the new workspace button of the open menu and waits for the editor.
   */
  async startCreate() {
    this.#gestures.click(await this.#appear("workspaceCreate"));
    await this.#appear("workspaceTitle");
  }
  /**
   * Opens the inline editor of an existing workspace row.
   *
   * @param name The name of the workspace.
   */
  async startRename(name) {
    if (!await this.#editor.openEditor(this.#row(name))) {
      throw new Error(`the editor of ${name} did not open`);
    }
  }
  /**
   * @param text The name to write in the editor.
   */
  async writeName(text) {
    this.#gestures.write(await this.#appear("workspaceTitle"), text);
  }
  /**
   * Presses the save button of the editor; without a button, submits its form.
   */
  async save() {
    const button = await this.#poll.until(() => this.#document.querySelector(this.#selectors.get("workspaceSave")), SAVE_BUTTON_MS);
    if (button !== null) {
      this.#gestures.click(button);
      return;
    }
    const form = this.#document.querySelector(this.#selectors.get("workspaceForm"));
    if (form === null) {
      throw new Error("there is nothing to save");
    }
    form.requestSubmit();
  }
  /**
   * Closes the menu with an Escape key press.
   */
  close() {
    this.#gestures.press(this.#document.body, "Escape");
  }
  #row(name) {
    const rows = [...this.#document.querySelectorAll(this.#selectors.get("workspaceRow"))].filter((row2) => (row2.getAttribute("title") ?? "").trim().startsWith(name));
    const row = rows.find((candidate) => candidate.getAttribute("title")?.trim() === name) ?? rows[0];
    if (row === void 0) {
      throw new Error(`no workspace row for ${name}`);
    }
    return row;
  }
  async #appear(selectorName) {
    const selector = this.#selectors.get(selectorName);
    const found = await this.#poll.until(() => this.#document.querySelector(selector), APPEAR_MS);
    if (found === null) {
      throw new Error(`${selectorName} did not appear`);
    }
    return found;
  }
}
export {
  WorkspaceMenu
};
