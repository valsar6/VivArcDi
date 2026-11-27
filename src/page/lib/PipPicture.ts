import { CredentialedAvatars } from './CredentialedAvatars.js';
import type { AvatarImage } from './CredentialedAvatars.js';
import type { CallTile } from './CallTiles.js';
import { TileLayout } from './TileLayout.js';
import type { PlacedTile, Rect } from './TileLayout.js';
import type { TilePager } from './TilePager.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FRAME_MS = 66;
const FRAME_RATE = 15;
const BACKGROUND = '#202124';
const TILE_BACKGROUND = '#3c4043';
const SILHOUETTE = '#9aa0a6';
const GAP = 2;
const AVATAR_SHARE = 0.25;

export interface PictureCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): CanvasRenderingContext2D | null;
  captureStream(frameRate: number): MediaStream;
}

export interface PictureVideo {
  muted: boolean;
  playsInline: boolean;
  disablePictureInPicture: boolean;
  srcObject: MediaProvider | null;
  play(): Promise<void>;
  requestPictureInPicture(): Promise<unknown>;
  remove(): void;
  addEventListener(type: 'leavepictureinpicture', listener: () => void): void;
}

export interface PictureEnvironment {
  createCanvas(): PictureCanvas;
  createVideo(): PictureVideo;
  createImage(): AvatarImage;
}

function drawCovering(context: CanvasRenderingContext2D, video: HTMLVideoElement, rect: Rect): void {
  const scale = Math.max(rect.width / video.videoWidth, rect.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  context.drawImage(video, rect.x + (rect.width - width) / 2, rect.y + (rect.height - height) / 2, width, height);
  context.restore();
}

function drawAvatar(context: CanvasRenderingContext2D, picture: AvatarImage | null, rect: Rect): void {
  const radius = Math.min(rect.width, rect.height) * AVATAR_SHARE;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();
  if (picture === null) {
    context.fillStyle = SILHOUETTE;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  } else {
    context.drawImage(picture as unknown as CanvasImageSource, centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  context.restore();
}

export class PipPicture {
  #environment: PictureEnvironment;
  #pager: TilePager;
  #avatars: CredentialedAvatars;
  #context: CanvasRenderingContext2D | null = null;
  #stream: MediaStream | null = null;
  #video: PictureVideo | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;

  /**
   * The call as one picture: every tile of the page drawn on a canvas that is redrawn about fifteen times a
   * second, played in a hidden video that can be floated. A page with a floating window is not throttled,
   * so a plain interval keeps its rate while the call tab is hidden.
   *
   * @param environment Makes the canvas, the video and the images.
   * @param pager The page of tiles to draw.
   */
  constructor(environment: PictureEnvironment, pager: TilePager) {
    this.#environment = environment;
    this.#pager = pager;
    this.#avatars = new CredentialedAvatars(() => environment.createImage());
  }

  /**
   * Draws the first picture, starts the stream and plays it.
   *
   * @returns The video to float.
   * @throws {Error} When the canvas cannot be used; nothing is left behind.
   */
  public async open(): Promise<PictureVideo> {
    try {
      const canvas = this.#environment.createCanvas();
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      this.#context = canvas.getContext('2d');
      if (this.#context === null) {
        throw new Error('The canvas has no 2d context');
      }
      this.#draw();
      const video = this.#environment.createVideo();
      this.#video = video;
      video.muted = true;
      video.playsInline = true;
      video.disablePictureInPicture = false;
      this.#stream = canvas.captureStream(FRAME_RATE);
      video.srcObject = this.#stream;
      this.#timer = setInterval(() => this.#draw(), FRAME_MS);
      await video.play();
      return video;
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  /**
   * Stops drawing, stops the stream and removes the video.
   */
  public dispose(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
    }
    this.#timer = null;
    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#stream = null;
    this.#video?.remove();
    this.#video = null;
    this.#context = null;
  }

  #draw(): void {
    const context = this.#context;
    if (context === null) {
      return;
    }
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    TileLayout.place(this.#pager.current(), WIDTH, HEIGHT).forEach((placed) => this.#paint(context, placed));
  }

  #paint(context: CanvasRenderingContext2D, { tile, rect }: PlacedTile): void {
    const inner = { x: rect.x + GAP, y: rect.y + GAP, width: rect.width - GAP * 2, height: rect.height - GAP * 2 };
    context.fillStyle = TILE_BACKGROUND;
    context.fillRect(inner.x, inner.y, inner.width, inner.height);
    if (this.#shows(tile)) {
      drawCovering(context, tile.video as HTMLVideoElement, inner);
    } else {
      drawAvatar(context, this.#avatars.picture(tile.avatar), inner);
    }
  }

  #shows(tile: CallTile): boolean {
    return tile.video !== null && tile.video.videoWidth > 0 && tile.video.videoHeight > 0;
  }
}
