class WindowKeys {
  #document;
  #resolve;
  #onCommand;
  #listener = (event) => this.#handle(event);
  /**
   * Takes chosen key presses away from Vivaldi's own shortcuts and turns them into commands, for
   * as long as `resolve` recognizes them.
   *
   * @param document The document of Vivaldi's window.
   * @param resolve Maps a key press to a command, or null to leave it to Vivaldi.
   * @param onCommand Carries out the command.
   */
  constructor(document, resolve, onCommand) {
    this.#document = document;
    this.#resolve = resolve;
    this.#onCommand = onCommand;
  }
  /**
   * Starts listening, before Vivaldi's own handlers.
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
    const command = this.#resolve(event);
    if (command === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#onCommand(command, event);
  }
}
export {
  WindowKeys
};
