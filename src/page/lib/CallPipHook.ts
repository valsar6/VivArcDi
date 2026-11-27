import { ShortcutKeys } from '../../core/dom/ShortcutKeys.js';
import type { CallPagePolicy, CallWarning } from '../../modules/callpip/CallMessage.js';
import { CallControls } from './CallControls.js';
import type { MediaSessionLike, ObserveMuted } from './CallControls.js';
import { CallDetector } from './CallDetector.js';
import { CallTiles } from './CallTiles.js';
import type { CallTile } from './CallTiles.js';
import { ClosePipCommand, OpenPipCommand } from './PipCommand.js';
import type { PipCommand } from './PipCommand.js';
import type { PictureEnvironment } from './PipPicture.js';
import { ComposedPipSource, LargestVideoSource } from './PipSource.js';
import type { PageHook } from './PageInstall.js';

export interface CallPageServices {
  /** Makes the canvas, the video and the images of the picture. */
  environment: PictureEnvironment;
  /** The Media Session of the page, or null where there is none. */
  mediaSession: MediaSessionLike | null;
  /** Watches the muted attribute of the microphone and camera buttons. */
  observe: ObserveMuted;
}

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
  #source: ComposedPipSource;
  #controls: CallControls;
  #warned = false;

  /**
   * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, or when the
   * interface asks for it after a tab switch, and closes the window when the tab is shown again or
   * the call ends. The window shows the whole call and carries its buttons. Each action is a command.
   *
   * @param policy The letter, the selectors, the page size and the identity of the page.
   * @param document The document of the call page.
   * @param warn Tells the interface that something on the page is not as expected.
   * @param services What the picture and the buttons of the window use.
   */
  constructor(policy: CallPagePolicy, document: Document, warn: (reason: CallWarning) => void, services: CallPageServices) {
    this.#document = document;
    this.#letter = policy.letter;
    this.#close = new ClosePipCommand(document);
    this.#detector = new CallDetector(document, policy.selectors.inCall, (inCall) => !inCall && this.closeWindow());
    const warnOnce = (reason: CallWarning): void => this.#warnOnce(reason, warn);
    this.#controls = new CallControls({ root: document, selectors: policy.selectors, session: services.mediaSession, observe: services.observe, warn: warnOnce });
    this.#source = new ComposedPipSource({
      environment: services.environment,
      read: (): CallTile[] => CallTiles.read(document, policy.selectors),
      maxTiles: policy.maxTiles,
      fallback: new LargestVideoSource(document, warnOnce),
      observer: this.#controls,
      warn: warnOnce,
    });
    const environment = { document, inCall: (): boolean => this.#detector.inCall() };
    this.#openFromKey = new OpenPipCommand(environment, () => true, this.#source);
    this.#openOnTabSwitch = new OpenPipCommand(environment, hasUserActivation, this.#source);
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
    this.#source.release();
  }

  #onKey = (event: KeyboardEvent): void => {
    if (this.#pageWithArrow(event)) {
      return;
    }
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
      this.closeWindow();
    }
  };

  #pageWithArrow(event: KeyboardEvent): boolean {
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    const moved = plain && !event.defaultPrevented && this.#controls.page(event.key);
    if (moved) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    return moved;
  }

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
