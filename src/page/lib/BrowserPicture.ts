import type { AvatarImage } from './CredentialedAvatars.js';
import type { ObserveMuted } from './CallControls.js';
import type { PictureCanvas, PictureEnvironment, PictureVideo } from './PipPicture.js';

const HIDDEN_VIDEO = 'position:fixed;left:-9999px;width:2px;height:2px';
const MUTED_ATTRIBUTE = 'data-is-muted';

export class BrowserPictureEnvironment implements PictureEnvironment {
  #document: Document;

  /**
   * The canvas, the hidden video and the images of the real page.
   *
   * @param document The document of the call page.
   */
  constructor(document: Document) {
    this.#document = document;
  }

  public createCanvas(): PictureCanvas {
    return this.#document.createElement('canvas');
  }

  public createVideo(): PictureVideo {
    const video = this.#document.createElement('video');
    video.style.cssText = HIDDEN_VIDEO;
    this.#document.body.appendChild(video);
    return video;
  }

  public createImage(): AvatarImage {
    return new Image();
  }
}

/**
 * Watches the muted attribute of an element with a `MutationObserver`, which a hidden tab does not
 * throttle.
 *
 * @param element The microphone or camera button.
 * @param onChange Called each time the attribute changes.
 * @returns What stops the watching.
 */
export const observeMuted: ObserveMuted = (element, onChange) => {
  if (typeof MutationObserver === 'undefined') {
    return () => undefined;
  }
  const observer = new MutationObserver(onChange);
  observer.observe(element, { attributes: true, attributeFilter: [MUTED_ATTRIBUTE] });
  return () => observer.disconnect();
};
