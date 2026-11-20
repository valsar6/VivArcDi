import { ShortcutKeys } from '../../core/dom/ShortcutKeys.js';
import type { CallPagePolicy, CallWarning } from '../../modules/callpip/CallMessage.js';
import { CallDetector } from './CallDetector.js';
import { ClosePipCommand, OpenPipCommand } from './PipCommand.js';
import type { PipCommand } from './PipCommand.js';
import type { PageHook } from './PageInstall.js';

function hasUserActivation(): boolean {
  return (globalThis.navigator as { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
}

export class CallPipHook implements PageHook {
  #document: Document;
  #detector: CallDetector;
  #letter: string;
  #openFromKey: PipCommand;
  #openOnTabSwitch: PipCommand;
  #close: PipCommand;
  #warned = false;

  /**
   * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, or when the
   * interface asks for it after a tab switch, and closes the window when the tab is shown again or
   * the call ends. Each action is a command.
   *
   * @param policy The letter, the selector of the in-call view and the identity of the page.
   * @param document The document of the call page.
   * @param warn Tells the interface that something on the page is not as expected.
   */
  constructor(policy: CallPagePolicy, document: Document, warn: (reason: CallWarning) => void) {
    this.#document = document;
    this.#letter = policy.letter;
    this.#close = new ClosePipCommand(document);
    this.#detector = new CallDetector(document, policy.inCallSelector, (inCall) => !inCall && this.#close.execute());
    const environment = { document, inCall: (): boolean => this.#detector.inCall(), warn: (reason: CallWarning): void => this.#warnOnce(reason, warn) };
    this.#openFromKey = new OpenPipCommand(environment, () => true);
    this.#openOnTabSwitch = new OpenPipCommand(environment, hasUserActivation);
  }

  public attach(): void {
    globalThis.addEventListener('keydown', this.#onKey, true);
    this.#document.addEventListener('visibilitychange', this.#onVisibility);
    this.#detector.start();
  }

  public detach(): void {
    globalThis.removeEventListener('keydown', this.#onKey, true);
    this.#document.removeEventListener('visibilitychange', this.#onVisibility);
    this.#detector.stop();
  }

  /**
   * Opens the window after a tab switch, when the browser still honors the user's last gesture.
   */
  public openOnTabSwitch(): void {
    this.#openOnTabSwitch.execute();
  }

  /**
   * Closes the window, if one is open.
   */
  public closeWindow(): void {
    this.#close.execute();
  }

  #onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !ShortcutKeys.isCommandShift(event, this.#letter)) {
      return;
    }
    const open = this.#document.pictureInPictureElement !== null;
    if (event.repeat) {
      this.#consumeIf(event, open || this.#detector.inCall());
      return;
    }
    this.#consumeIf(event, open ? this.#close.execute() : this.#openFromKey.execute());
  };

  #onVisibility = (): void => {
    if (!this.#document.hidden) {
      this.#close.execute();
    }
  };

  #consumeIf(event: KeyboardEvent, handled: boolean): void {
    if (handled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  #warnOnce(reason: CallWarning, warn: (reason: CallWarning) => void): void {
    if (!this.#warned) {
      this.#warned = true;
      warn(reason);
    }
  }
}
