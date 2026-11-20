import type { CallWarning } from '../../modules/callpip/CallMessage.js';
import { CallVideo } from './CallVideo.js';

export interface PipCommand {
  /**
   * @returns Whether the command did something.
   */
  execute(): boolean;
}

export interface PipEnvironment {
  /** The document of the call page. */
  document: Document;
  /** Whether a call is in progress. */
  inCall: () => boolean;
  /** Tells the interface that something on the page is not as expected. */
  warn: (reason: CallWarning) => void;
}

export class OpenPipCommand implements PipCommand {
  #environment: PipEnvironment;
  #allowed: () => boolean;

  /**
   * Floats the call video in Picture in Picture.
   *
   * @param environment The page and what it knows about the call.
   * @param allowed Whether the browser would honor the request now, such as a check for user activation.
   */
  constructor(environment: PipEnvironment, allowed: () => boolean) {
    this.#environment = environment;
    this.#allowed = allowed;
  }

  public execute(): boolean {
    const { document, inCall, warn } = this.#environment;
    if (document.pictureInPictureElement !== null || !this.#allowed() || !inCall()) {
      return false;
    }
    const video = CallVideo.pick(document);
    if (video === null) {
      return false;
    }
    video.disablePictureInPicture = false;
    video.requestPictureInPicture().catch(() => warn('request-failed'));
    return true;
  }
}

export class ClosePipCommand implements PipCommand {
  #document: Document;

  /**
   * Closes the Picture in Picture window of the page.
   *
   * @param document The document of the call page.
   */
  constructor(document: Document) {
    this.#document = document;
  }

  public execute(): boolean {
    if (this.#document.pictureInPictureElement === null) {
      return false;
    }
    this.#document.exitPictureInPicture().catch(() => undefined);
    return true;
  }
}
