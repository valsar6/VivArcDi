import type { PipSource } from './PipSource.js';

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
}

export class OpenPipCommand implements PipCommand {
  #environment: PipEnvironment;
  #allowed: () => boolean;
  #source: PipSource;

  /**
   * Floats the call in Picture in Picture.
   *
   * @param environment The page and what it knows about the call.
   * @param allowed Whether the browser would honor the request now, such as a check for user activation.
   * @param source What to float: the whole call, or its largest video.
   */
  constructor(environment: PipEnvironment, allowed: () => boolean, source: PipSource) {
    this.#environment = environment;
    this.#allowed = allowed;
    this.#source = source;
  }

  public execute(): boolean {
    const { document, inCall } = this.#environment;
    if (document.pictureInPictureElement !== null || !this.#allowed() || !inCall()) {
      return false;
    }
    return this.#source.open();
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
