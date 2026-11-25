import type { ModuleContext } from '../../core/boot/Module.js';

const ORIGIN = 0;

function measure(element: Element): DOMRect | null {
  if (typeof element.getBoundingClientRect !== 'function') {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return rect.width <= ORIGIN || rect.height <= ORIGIN ? null : rect;
}

export class SidebarBox {
  public readonly left: number;
  public readonly right: number;
  public readonly top: number;
  public readonly bottom: number;

  /**
   * A rendered sidebar in screen coordinates.
   *
   * @param left Left edge in pixels.
   * @param right Right edge in pixels.
   * @param top Top edge in pixels.
   * @param bottom Bottom edge in pixels.
   */
  constructor(left: number, right: number, top: number, bottom: number) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }

  /**
   * @param document The window's interface document.
   * @param selector The selector of the vertical tab bar.
   * @returns The box, or null when the sidebar is missing or hidden.
   */
  public static read(document: Document, selector: string): SidebarBox | null {
    const element = document.querySelector(selector);
    if (element === null) {
      return null;
    }
    const rect = measure(element);
    if (rect === null) {
      return null;
    }
    const offsetLeft = document.defaultView?.screenX ?? ORIGIN;
    const offsetTop = document.defaultView?.screenY ?? ORIGIN;
    return new SidebarBox(
      offsetLeft + rect.left,
      offsetLeft + rect.right,
      offsetTop + rect.top,
      offsetTop + rect.bottom,
    );
  }
}

/**
 * @param context The window's document and selector catalog.
 * @returns The sidebar of that window, or null when the selector or the sidebar is missing.
 */
export function sidebarOf(context: Pick<ModuleContext, 'document' | 'selectors'>): SidebarBox | null {
  if (!context.selectors.has('verticalTabBar')) {
    return null;
  }
  return SidebarBox.read(context.document, context.selectors.get('verticalTabBar'));
}
