import { commandFor } from "./PeekKeyMap.js";
class PeekKeys {
  #document;
  #isOpen;
  #onCommand;
  #listener = (event) => this.#handle(event);
  /**
   * While a Peek is open, takes Esc, Cmd/Ctrl+W and Cmd/Ctrl+O away from Vivaldi's
   * shortcuts, so that they act on the Peek and never close the tab behind it.
   *
   * @param document The document of Vivaldi's browser window.
   * @param isOpen Tells whether a Peek is open.
   * @param onCommand Carries out the command.
   */
  constructor(document, isOpen, onCommand) {
    this.#document = document;
    this.#isOpen = isOpen;
    this.#onCommand = onCommand;
  }
  /**
   * Starts listening.
   */
  attach() {
    this.#document.addEventListener("keydown", this.#listener, true);
  }
  /**
   * Stops listening.
   */
  detach() {
    this.#document.removeEventListener("keydown", this.#listener, true);
  }
  #handle(event) {
    const command = this.#isOpen() ? commandFor(event) : null;
    if (command === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#onCommand(command);
  }
}
export {
  PeekKeys
};
