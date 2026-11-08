import type { ScreenArea } from './WindowBounds.js';

interface ScreenLike {
  availWidth: number;
  availHeight: number;
  availLeft?: number;
  availTop?: number;
}

const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 800;

/**
 * @param document The document of a Vivaldi window.
 * @returns The usable area of the screen the window is on, or a plain 1280 by 800 area when the
 * screen cannot be read.
 */
export function screenOf(document: Document): ScreenArea {
  const screen = document.defaultView?.screen as ScreenLike | undefined;
  if (screen === undefined) {
    return { width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT, left: 0, top: 0 };
  }
  return { width: screen.availWidth, height: screen.availHeight, left: screen.availLeft ?? 0, top: screen.availTop ?? 0 };
}
