import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';

export const DRAG_PILL_ATTRIBUTE = 'data-vivarcdi-drag-pill';

/** What the pill shows: the title of the dragged page and the address of its icon, if it has one. */
export interface PillContent {
  title: string;
  iconUrl: string | null;
}

export interface DragPillDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of the element that receives the pill, such as `#browser`. */
  parentSelector: string;
  /** Selector of the tab bar; the pill is visible only while the pointer is inside it. */
  tabBarSelector: string;
  /** Frame scheduling, replaceable in tests. */
  timing?: FrameTiming;
}

interface Point {
  x: number;
  y: number;
}

const OFFSET_PX = 12;

export class DragPill {
  static #instances = new WeakMap<object, DragPill>();

  #deps: DragPillDependencies;
  #task: FrameTask;
  #element: HTMLElement | null = null;
  #point: Point = { x: 0, y: 0 };

  /**
   * The pill that follows the pointer while a tab, a link row or a tile is dragged: a white label
   * with the icon and the title of the page, fixed in the window and ignored by the pointer. It
   * follows the pointer with a transform, once per frame, and shows only while the pointer is
   * over the tab bar, so outside it the drag image of Vivaldi is the only one.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: DragPillDependencies) {
    this.#deps = dependencies;
    this.#task = new FrameTask(() => this.#place(), dependencies.timing);
  }

  /**
   * The pill shared by every module of a window, so that two drags never draw two pills.
   *
   * @param scope Usually the browser window document; the same scope gives the same pill.
   * @param selectors Needs `browser` and `tabBar`.
   * @returns The pill of that scope.
   */
  public static of(scope: Document, selectors: Pick<SelectorCatalog, 'get'>): DragPill {
    const existing = DragPill.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new DragPill({ document: scope, parentSelector: selectors.get('browser'), tabBarSelector: selectors.get('tabBar') });
    DragPill.#instances.set(scope, created);
    return created;
  }

  /**
   * Reads what the pill shows from a row or a tile: its `title` attribute and its first image.
   *
   * @param element A link row or a tile.
   * @returns The title and the icon address.
   */
  public static contentOf(element: Element): PillContent {
    return { title: element.getAttribute('title') ?? '', iconUrl: element.querySelector('img')?.getAttribute('src') ?? null };
  }

  /**
   * Draws the pill with a page and puts it at the pointer.
   *
   * @param content The title and the icon.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public show(content: PillContent, x: number, y: number): void {
    this.hide();
    const element = this.#deps.document.createElement('div');
    element.setAttribute(DRAG_PILL_ATTRIBUTE, '');
    element.setAttribute('hidden', '');
    if (content.iconUrl !== null) {
      const icon = this.#deps.document.createElement('img');
      icon.setAttribute('alt', '');
      icon.setAttribute('src', content.iconUrl);
      element.append(icon);
    }
    const title = this.#deps.document.createElement('span');
    title.textContent = content.title;
    element.append(title);
    (this.#deps.document.querySelector(this.#deps.parentSelector) ?? this.#deps.document.body).append(element);
    this.#element = element;
    this.move(x, y);
  }

  /**
   * Follows the pointer on the next frame.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  public move(x: number, y: number): void {
    this.#point = { x, y };
    this.#task.request();
  }

  /**
   * Removes the pill.
   */
  public hide(): void {
    this.#task.cancel();
    this.#element?.remove();
    this.#element = null;
  }

  #place(): void {
    const element = this.#element;
    if (element === null) {
      return;
    }
    const { x, y } = this.#point;
    element.toggleAttribute('hidden', !this.#overTabBar(x, y));
    element.style.setProperty('transform', `translate(${x + OFFSET_PX}px, ${y + OFFSET_PX}px)`);
  }

  #overTabBar(x: number, y: number): boolean {
    const bar = this.#deps.document.querySelector(this.#deps.tabBarSelector);
    if (bar === null) {
      return false;
    }
    const { left, right, top, bottom } = bar.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }
}
