import type { CallTile } from '../../src/page/lib/CallTiles.js';
import type { AvatarImage } from '../../src/page/lib/CredentialedAvatars.js';
import type { PictureCanvas, PictureEnvironment, PictureVideo } from '../../src/page/lib/PipPicture.js';

export const WIDTH = 1280;
export const HEIGHT = 720;
export const SILHOUETTE = '#9aa0a6';

export interface Operation {
  op: string;
  args: unknown[];
  fill: unknown;
}

export class FakeContext {
  public operations: Operation[] = [];
  public fillStyle: unknown = '';

  public fillRect(...args: unknown[]): void {
    this.record('fillRect', args);
  }

  public drawImage(...args: unknown[]): void {
    this.record('drawImage', args);
  }

  public save(): void {
    this.record('save', []);
  }

  public restore(): void {
    this.record('restore', []);
  }

  public beginPath(): void {
    this.record('beginPath', []);
  }

  public rect(...args: unknown[]): void {
    this.record('rect', args);
  }

  public arc(...args: unknown[]): void {
    this.record('arc', args);
  }

  public clip(): void {
    this.record('clip', []);
  }

  public drawn(source: unknown): Operation[] {
    return this.operations.filter((entry) => entry.op === 'drawImage' && entry.args[0] === source);
  }

  public silhouettes(): Operation[] {
    return this.operations.filter((entry) => entry.op === 'fillRect' && entry.fill === SILHOUETTE);
  }

  public frames(): number {
    return this.operations.filter((entry) => entry.op === 'fillRect' && entry.args[2] === WIDTH && entry.args[3] === HEIGHT).length;
  }

  private record(op: string, args: unknown[]): void {
    this.operations.push({ op, args, fill: this.fillStyle });
  }
}

export class FakeStream {
  public stopped = 0;

  public getTracks(): Array<{ stop(): void }> {
    return [{ stop: (): void => void (this.stopped += 1) }];
  }
}

export class FakeCanvas implements PictureCanvas {
  public width = 0;
  public height = 0;
  public context = new FakeContext();
  public stream = new FakeStream();
  public failCapture = false;

  public getContext(): CanvasRenderingContext2D | null {
    return this.context as unknown as CanvasRenderingContext2D;
  }

  public captureStream(): MediaStream {
    if (this.failCapture) {
      throw new Error('Canvas is not origin-clean');
    }
    return this.stream as unknown as MediaStream;
  }
}

export class FakePictureVideo implements PictureVideo {
  public muted = false;
  public playsInline = false;
  public disablePictureInPicture = true;
  public srcObject: MediaProvider | null = null;
  public played = 0;
  public entered = 0;
  public removed = false;
  public onEnter: () => void = () => undefined;
  public listeners: Array<() => void> = [];

  public play(): Promise<void> {
    this.played += 1;
    return Promise.resolve();
  }

  public requestPictureInPicture(): Promise<unknown> {
    this.entered += 1;
    this.onEnter();
    return Promise.resolve({});
  }

  public remove(): void {
    this.removed = true;
  }

  public addEventListener(_type: 'leavepictureinpicture', listener: () => void): void {
    this.listeners.push(listener);
  }

  public leave(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export class FakeImage implements AvatarImage {
  public crossOrigin: string | null = null;
  public src = '';
  public complete = false;
  public naturalWidth = 0;

  public load(width = 128): void {
    this.complete = true;
    this.naturalWidth = width;
  }
}

export class FakePictureEnvironment implements PictureEnvironment {
  public canvases: FakeCanvas[] = [];
  public videos: FakePictureVideo[] = [];
  public images: FakeImage[] = [];
  public failCapture = false;
  public onEnter: () => void = () => undefined;

  public createCanvas(): PictureCanvas {
    const canvas = new FakeCanvas();
    canvas.failCapture = this.failCapture;
    this.canvases.push(canvas);
    return canvas;
  }

  public createVideo(): PictureVideo {
    const video = new FakePictureVideo();
    video.onEnter = this.onEnter;
    this.videos.push(video);
    return video;
  }

  public createImage(): AvatarImage {
    const image = new FakeImage();
    this.images.push(image);
    return image;
  }

  public get context(): FakeContext {
    return this.canvases[0]?.context ?? new FakeContext();
  }
}

export function video(width = 640, height = 360): HTMLVideoElement {
  return { videoWidth: width, videoHeight: height } as unknown as HTMLVideoElement;
}

export function cameraTile(area = 26572): CallTile {
  return { video: video(), avatar: null, area };
}

export function avatarTile(src = 'https://avatars.example/a', area = 26572): CallTile {
  return { video: null, avatar: src, area };
}

export function screenTile(area = 292120): CallTile {
  return { video: video(1280, 720), avatar: null, area };
}

export function cameras(count: number): CallTile[] {
  return Array.from({ length: count }, () => cameraTile());
}
