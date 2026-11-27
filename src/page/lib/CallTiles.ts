import type { CallSelectors } from '../../modules/callpip/CallMessage.js';
import { isLiveVideo } from './CallVideo.js';

export interface CallTile {
  /** The video that shows the participant, or null while the camera is off. */
  video: HTMLVideoElement | null;
  /** Address of the participant's avatar picture, or null when the tile shows none. */
  avatar: string | null;
  /** The area the page gives the tile, in square pixels. */
  area: number;
}

function largestAvatar(tile: Element, selector: string): string | null {
  const images = Array.from(tile.querySelectorAll<HTMLImageElement>(selector));
  const largest = images.reduce<HTMLImageElement | null>((best, image) => (best === null || image.naturalWidth > best.naturalWidth ? image : best), null);
  return largest?.src ?? null;
}

function areaOf(tile: Element): number {
  const { width, height } = tile.getBoundingClientRect();
  return width * height;
}

export class CallTiles {
  /**
   * Reads the tiles of a call page: one per participant, the user's own included, in page order. The
   * page's names and texts are never read.
   *
   * @param root The document of a call page.
   * @param selectors The tile and avatar selectors of the site.
   * @returns The tiles, each with its live video or its avatar picture.
   */
  public static read(root: ParentNode, selectors: Pick<CallSelectors, 'tile' | 'avatar'>): CallTile[] {
    return Array.from(root.querySelectorAll(selectors.tile), (tile) => ({
      video: Array.from(tile.querySelectorAll('video')).find(isLiveVideo) ?? null,
      avatar: largestAvatar(tile, selectors.avatar),
      area: areaOf(tile),
    }));
  }
}
