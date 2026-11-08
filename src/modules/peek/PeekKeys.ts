import { WindowKeys } from '../../core/WindowKeys.js';
import { commandFor } from './PeekKeyMap.js';
import type { PeekCommand } from './PeekMessage.js';

export class PeekKeys {
  #keys: WindowKeys<PeekCommand>;

  /**
   * While a Peek is open, takes Esc, Cmd/Ctrl+W and Cmd/Ctrl+O away from Vivaldi's
   * shortcuts, so that they act on the Peek and never close the tab behind it.
   *
   * @param document The document of Vivaldi's browser window.
   * @param isOpen Tells whether a Peek is open.
   * @param onCommand Carries out the command.
   */
  constructor(document: Document, isOpen: () => boolean, onCommand: (command: PeekCommand) => void) {
    this.#keys = new WindowKeys(document, (event) => (isOpen() ? commandFor(event) : null), onCommand);
  }

  /**
   * Starts listening.
   */
  public attach(): void {
    this.#keys.attach();
  }

  /**
   * Stops listening.
   */
  public detach(): void {
    this.#keys.detach();
  }
}
