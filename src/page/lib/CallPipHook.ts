import { ShortcutKeys } from '../../core/dom/ShortcutKeys.js';
import type { CallPagePolicy, CallWarning } from '../../modules/callpip/CallMessage.js';
import { CallDetector } from './CallDetector.js';
import { CallVideo } from './CallVideo.js';
import type { PageHook } from './PageInstall.js';

export class CallPipHook implements PageHook {
  #policy: CallPagePolicy;
  #document: Document;
  #warn: (reason: CallWarning) => void;
  #detector: CallDetector;
  #warned = false;

  /**
   * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, and closes the
   * window when the tab is shown again or the call ends.
   *
   * @param policy The letter, the selector of the in-call view and the identity of the page.
   * @param document The document of the call page.
   * @param warn Tells the interface that something on the page is not as expected.
   */
  constructor(policy: CallPagePolicy, document: Document, warn: (reason: CallWarning) => void) {
    this.#policy = policy;
    this.#document = document;
    this.#warn = warn;
    this.#detector = new CallDetector(document, policy.inCallSelector, (inCall) => this.#onCall(inCall));
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
    this.#close();
  }

  #onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !ShortcutKeys.isCommandShift(event, this.#policy.letter)) {
      return;
    }
    if (this.#document.pictureInPictureElement !== null) {
      this.#consume(event);
      this.#close();
      return;
    }
    const video = this.#detector.inCall() ? CallVideo.pick(this.#document) : null;
    if (video !== null) {
      this.#consume(event);
      this.#open(video);
    }
  };

  #onVisibility = (): void => {
    if (!this.#document.hidden) {
      this.#close();
    }
  };

  #onCall(inCall: boolean): void {
    if (!inCall) {
      this.#close();
    }
  }

  #consume(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  #open(video: HTMLVideoElement): void {
    video.disablePictureInPicture = false;
    video.requestPictureInPicture().catch(() => this.#warnOnce('request-failed'));
  }

  #close(): void {
    if (this.#document.pictureInPictureElement !== null) {
      this.#document.exitPictureInPicture().catch(() => undefined);
    }
  }

  #warnOnce(reason: CallWarning): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#warn(reason);
    }
  }
}
