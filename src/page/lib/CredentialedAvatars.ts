export interface AvatarImage {
  crossOrigin: string | null;
  src: string;
  complete: boolean;
  naturalWidth: number;
}

export class CredentialedAvatars {
  #create: () => AvatarImage;
  #images = new Map<string, AvatarImage>();

  /**
   * Loads each avatar again with `crossOrigin = 'use-credentials'`, which the avatar host approves for the
   * call site. The page's own copy has no such approval and would taint the canvas it is drawn on, so it
   * is never drawn.
   *
   * @param create Makes an empty image.
   */
  constructor(create: () => AvatarImage) {
    this.#create = create;
  }

  /**
   * @param src The address of an avatar, or null.
   * @returns The loaded picture, or null while it loads, when it fails or when there is no address.
   */
  public picture(src: string | null): AvatarImage | null {
    if (src === null) {
      return null;
    }
    let image = this.#images.get(src);
    if (image === undefined) {
      image = this.#create();
      image.crossOrigin = 'use-credentials';
      image.src = src;
      this.#images.set(src, image);
    }
    return image.complete && image.naturalWidth > 0 ? image : null;
  }
}
