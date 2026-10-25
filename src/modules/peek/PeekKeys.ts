import { commandFor } from './PeekKeyMap.js';
import type { PeekCommand } from './PeekMessage.js';

export class PeekKeys {
  #document: Document;
  #isOpen: () => boolean;
  #onCommand: (command: PeekCommand) => void;
  #listener = (event: Event): void => this.#handle(event as KeyboardEvent);

  /**
   * While a Peek is open, takes Esc, Cmd/Ctrl+W and Cmd/Ctrl+O away from Vivaldi's
   * shortcuts, so that they act on the Peek and never close the tab behind it.
   *
   * @param document The document of Vivaldi's browser window.
   * @param isOpen Tells whether a Peek is open.
   * @param onCommand Carries out the command.
   */
  constructor(document: Document, isOpen: () => boolean, onCommand: (command: PeekCommand) => void) {
    this.#document = document;
    this.#isOpen = isOpen;
    this.#onCommand = onCommand;
  }

  /**
   * Starts listening.
   */
  public attach(): void {
    this.#document.addEventListener('keydown', this.#listener, true);
  }

  /**
   * Stops listening.
   */
  public detach(): void {
    this.#document.removeEventListener('keydown', this.#listener, true);
  }

  #handle(event: KeyboardEvent): void {
    const command = this.#isOpen() ? commandFor(event) : null;
    if (command === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#onCommand(command);
  }
}
