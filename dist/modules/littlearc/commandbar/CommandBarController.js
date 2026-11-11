import { MAX_ROWS, suggestionRow, typedRow } from "./CommandRow.js";
import { SelectionCursor } from "./SelectionCursor.js";
class CommandBarController {
  #dependencies;
  #cursor = new SelectionCursor();
  #listeners = /* @__PURE__ */ new Set();
  #open = false;
  #text = "";
  #rows = [];
  #request = 0;
  /**
   * The state of the command bar, with no DOM: whether it is open, the text, the rows and the
   * selected one. Enter asks the launcher to open the selected row; closing opens nothing.
   *
   * @param dependencies The suggestions, the launcher of Little Arc windows and a logger.
   */
  constructor(dependencies) {
    this.#dependencies = dependencies;
  }
  /**
   * @returns The current state.
   */
  get state() {
    return { open: this.#open, text: this.#text, rows: this.#rows, selected: this.#cursor.index };
  }
  /**
   * @param listener Called after every change.
   * @returns A function that removes the listener.
   */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }
  /**
   * Opens the bar with an empty field, which lists the most recent pages.
   */
  async open() {
    this.#open = true;
    this.#rows = [];
    await this.type("");
  }
  /**
   * Sets the text and refreshes the list: the text itself first, then the suggestions.
   *
   * @param text What the field holds.
   */
  async type(text) {
    this.#text = text;
    const request = ++this.#request;
    const first = typedRow(text);
    const limit = first === null ? MAX_ROWS : MAX_ROWS - 1;
    this.#set([...first === null ? [] : [first], ...this.#rows.filter((row) => row.icon === "favicon").slice(0, limit)]);
    const suggestions = await this.#dependencies.list.suggest(text, limit).catch((error) => {
      this.#dependencies.logger.warn("the suggestions could not be read", error);
      return [];
    });
    if (request === this.#request && this.#open) {
      this.#set([...first === null ? [] : [first], ...suggestions.map(suggestionRow)]);
    }
  }
  /**
   * Selects the previous row, wrapping around.
   */
  up() {
    this.#cursor.up();
    this.#notify();
  }
  /**
   * Selects the next row, wrapping around.
   */
  down() {
    this.#cursor.down();
    this.#notify();
  }
  /**
   * @param index The row the pointer is over.
   */
  select(index) {
    this.#cursor.select(index);
    this.#notify();
  }
  /**
   * Closes the bar and opens the selected row in a Little Arc window. With no row it does nothing.
   *
   * @returns Whether a window was opened.
   */
  async submit() {
    const row = this.#rows[this.#cursor.index];
    if (!this.#open || row === void 0) {
      return false;
    }
    this.dismiss();
    try {
      return await this.#dependencies.launcher.openAddress(row.url);
    } catch (error) {
      this.#dependencies.logger.error("could not open the page of the command bar", error);
      return false;
    }
  }
  /**
   * Selects a row and opens it, as a click does.
   *
   * @param index The row.
   * @returns Whether a window was opened.
   */
  activate(index) {
    this.select(index);
    return this.submit();
  }
  /**
   * Closes the bar and opens nothing.
   */
  dismiss() {
    this.#open = false;
    this.#request += 1;
    this.#set([]);
  }
  #set(rows) {
    this.#rows = rows;
    this.#cursor.reset(rows.length);
    this.#notify();
  }
  #notify() {
    const state = this.state;
    this.#listeners.forEach((listener) => listener(state));
  }
}
export {
  CommandBarController
};
