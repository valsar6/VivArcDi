export class WindowKeys<Command> {
  #document: Document;
  #resolve: (event: KeyboardEvent) => Command | null;
  #onCommand: (command: Command, event: KeyboardEvent) => void;
  #listener = (event: Event): void => this.#handle(event as KeyboardEvent);

  /**
   * Takes chosen key presses away from Vivaldi's own shortcuts and turns them into commands, for
   * as long as `resolve` recognizes them.
   *
   * @param document The document of Vivaldi's window.
   * @param resolve Maps a key press to a command, or null to leave it to Vivaldi.
   * @param onCommand Carries out the command.
   */
  constructor(
    document: Document,
    resolve: (event: KeyboardEvent) => Command | null,
    onCommand: (command: Command, event: KeyboardEvent) => void,
  ) {
    this.#document = document;
    this.#resolve = resolve;
    this.#onCommand = onCommand;
  }

  /**
   * Starts listening, before Vivaldi's own handlers.
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
    const command = this.#resolve(event);
    if (command === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#onCommand(command, event);
  }
}
