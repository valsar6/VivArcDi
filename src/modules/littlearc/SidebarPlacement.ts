import type { SidebarBox } from './SidebarBox.js';
import type { Bounds, ScreenArea, WindowBoundsSettings } from './WindowBounds.js';

const SIDEBAR_GAP = 12;
const MIN_POPUP_WIDTH = 320;
const PERCENT = 100;

export interface PlacementResult {
  bounds: Bounds;
  shrunk: boolean;
}

export class SidebarPlacement {
  /**
   * @param sidebar The sidebar's box, or null when it cannot be read.
   * @param screen The usable screen area in screen coordinates.
   * @param size The configured width and height in percent.
   * @returns Bounds beside the sidebar, or null when the centred fallback is needed.
   */
  public beside(sidebar: SidebarBox | null, screen: ScreenArea, size: WindowBoundsSettings): PlacementResult | null {
    if (sidebar === null) {
      return null;
    }
    const width = Math.round((screen.width * size.widthPercent) / PERCENT);
    const height = Math.round((screen.height * size.heightPercent) / PERCENT);
    const top = screen.top + Math.round((screen.height - height) / 2);
    const rightOfSidebar = sidebar.right + SIDEBAR_GAP;
    if (rightOfSidebar + width <= screen.left + screen.width) {
      return { bounds: { width, height, left: rightOfSidebar, top }, shrunk: false };
    }
    const leftOfSidebar = sidebar.left - width - SIDEBAR_GAP;
    if (leftOfSidebar >= screen.left) {
      return { bounds: { width, height, left: leftOfSidebar, top }, shrunk: false };
    }
    const spaceRight = screen.left + screen.width - sidebar.right - SIDEBAR_GAP;
    const spaceLeft = sidebar.left - SIDEBAR_GAP - screen.left;
    if (Math.max(spaceRight, spaceLeft) < MIN_POPUP_WIDTH) {
      return null;
    }
    const fitted = Math.min(width, Math.max(spaceRight, spaceLeft));
    const left = spaceRight >= spaceLeft ? rightOfSidebar : sidebar.left - fitted - SIDEBAR_GAP;
    return { bounds: { width: fitted, height, left, top }, shrunk: true };
  }

  /**
   * @param sidebar The sidebar's box, or null when it cannot be read.
   * @param bounds The popup's bounds in screen coordinates.
   * @returns Whether the two rectangles intersect.
   */
  public overlaps(sidebar: SidebarBox | null, bounds: Bounds): boolean {
    if (sidebar === null) {
      return false;
    }
    return bounds.left < sidebar.right
      && bounds.left + bounds.width > sidebar.left
      && bounds.top < sidebar.bottom
      && bounds.top + bounds.height > sidebar.top;
  }
}
