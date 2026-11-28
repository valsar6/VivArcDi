import type { CallWarning } from '../../modules/callpip/CallMessage.js';
import { CallVideo } from './CallVideo.js';
import { PipPicture } from './PipPicture.js';
import type { PictureEnvironment } from './PipPicture.js';
import { TilePager } from './TilePager.js';
import type { CallTile } from './CallTiles.js';

export interface PipSource {
  /**
   * Starts floating the call.
   *
   * @returns Whether something was started.
   */
  open(): boolean;
  /**
   * Gives back what the source built; the window itself is closed by the caller.
   */
  release(): void;
}

export interface PictureObserver {
  /** The window of a picture is open and its pages can be moved. */
  opened(pager: TilePager): void;
  /** The window of the picture is gone. */
  closed(): void;
}

export class LargestVideoSource implements PipSource {
  #document: Document;
  #warn: (reason: CallWarning) => void;

  /**
   * Floats the largest live video of the page: the behavior of spec 054, used when the whole call cannot
   * be composed.
   *
   * @param document The document of the call page.
   * @param warn Tells the interface that something on the page is not as expected.
   */
  constructor(document: Document, warn: (reason: CallWarning) => void) {
    this.#document = document;
    this.#warn = warn;
  }

  public open(): boolean {
    const video = CallVideo.pick(this.#document);
    if (video === null) {
      return false;
    }
    video.disablePictureInPicture = false;
    video.requestPictureInPicture().catch(() => this.#warn('request-failed'));
    return true;
  }

  public release(): void {
    return undefined;
  }
}

export interface ComposedSourceParts {
  /** Makes the canvas, the video and the images. */
  environment: PictureEnvironment;
  /** Reads the tiles of the call page. */
  read: () => CallTile[];
  /** How many tiles one page holds. */
  maxTiles: number;
  /** Used when the call cannot be composed. */
  fallback: PipSource;
  /** Hears when the window opens and closes. */
  observer: PictureObserver;
  /** Tells the interface that something on the page is not as expected. */
  warn: (reason: CallWarning) => void;
}

export class ComposedPipSource implements PipSource {
  #parts: ComposedSourceParts;
  #picture: PipPicture | null = null;

  /**
   * Floats the whole call as one picture. A page with no tiles, or a picture that cannot be built or
   * floated, falls back to the largest video with one warning.
   *
   * @param parts What the source needs.
   */
  constructor(parts: ComposedSourceParts) {
    this.#parts = parts;
  }

  public open(): boolean {
    if (this.#picture !== null) {
      return false;
    }
    if (this.#parts.read().length === 0) {
      return this.#parts.fallback.open();
    }
    this.#float().catch(() => {
      this.#parts.warn('composition-failed');
      this.#parts.fallback.open();
    });
    return true;
  }

  public release(): void {
    this.#picture?.dispose();
    this.#picture = null;
    this.#parts.observer.closed();
  }

  async #float(): Promise<void> {
    const { environment, read, maxTiles, observer } = this.#parts;
    const pager = new TilePager(maxTiles, read);
    const picture = new PipPicture(environment, pager);
    this.#picture = picture;
    try {
      const video = await picture.open();
      await video.requestPictureInPicture();
      video.addEventListener('leavepictureinpicture', () => this.release());
      observer.opened(pager);
    } catch (error) {
      this.release();
      throw error;
    }
  }
}
