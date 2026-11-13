import { WindowKeys } from "../../core/dom/WindowKeys.js";
import { commandFor } from "./PeekKeyMap.js";
class PeekKeys {
  #keys;
  /**
   * While a Peek is open, takes Esc, Cmd/Ctrl+W and Cmd/Ctrl+O away from Vivaldi's
   * shortcuts, so that they act on the Peek and never close the tab behind it.
   *
   * @param document The document of Vivaldi's browser window.
   * @param isOpen Tells whether a Peek is open.
   * @param onCommand Carries out the command.
   */
  constructor(document, isOpen, onCommand) {
    this.#keys = new WindowKeys(document, (event) => isOpen() ? commandFor(event) : null, onCommand);
  }
  /**
   * Starts listening.
   */
  attach() {
    this.#keys.attach();
  }
  /**
   * Stops listening.
   */
  detach() {
    this.#keys.detach();
  }
}
export {
  PeekKeys
};
