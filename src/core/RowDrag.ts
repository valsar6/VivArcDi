export const DRAGGING_ATTRIBUTE = 'data-vivarcdi-dragging';

export interface RowDragDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that holds the draggable ones, when it is in the window; only its children are followed. */
  container: () => HTMLElement | null;
  /** Selector of the draggable elements. */
  selector: string;
  /** Attribute of the draggable elements that gives their id. */
  idAttribute: string;
  /** Called while an element is dragged, with its id and the position of the pointer. */
  onMove: (id: string, x: number, y: number) => void;
  /** Called when the button is released after a drag, with the id and the position of the pointer. */
  onDrop: (id: string, x: number, y: number) => void;
  /** Called when the drag ends, dropped or not. */
  onEnd: () => void;
}

interface Press {
  element: HTMLElement;
  id: string;
  x: number;
  y: number;
  dragging: boolean;
}

const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;

export class RowDrag {
  #deps: RowDragDependencies;
  #press: Press | null = null;
  #onDown = (event: Event): void => this.#down(event as MouseEvent);
  #onMove = (event: Event): void => this.#move(event as MouseEvent);
  #onUp = (event: Event): void => this.#up(event as MouseEvent);
  #onClick = (event: Event): void => this.#swallow(event);

  /**
   * Follows a row or a tile of VivArcDi being moved with the mouse: the button goes down on it,
   * the pointer moves more than a few pixels, and the button goes up somewhere. The element is
   * dimmed while it is dragged, and the click that follows the release is swallowed so it does not
   * open.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: RowDragDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    const { document } = this.#deps;
    document.addEventListener('mousedown', this.#onDown, true);
    document.addEventListener('mousemove', this.#onMove, true);
    document.addEventListener('mouseup', this.#onUp, true);
  }

  /**
   * Stops listening and forgets a drag in progress.
   */
  public detach(): void {
    const { document } = this.#deps;
    document.removeEventListener('mousedown', this.#onDown, true);
    document.removeEventListener('mousemove', this.#onMove, true);
    document.removeEventListener('mouseup', this.#onUp, true);
    document.removeEventListener('click', this.#onClick, true);
    this.#end();
  }

  #down(event: MouseEvent): void {
    this.#deps.document.removeEventListener('click', this.#onClick, true);
    this.#press = null;
    const element = event.button === PRIMARY_BUTTON ? this.#elementOf(event.target) : null;
    const id = element?.getAttribute(this.#deps.idAttribute) ?? null;
    if (element !== null && id !== null) {
      this.#press = { element, id, x: event.clientX, y: event.clientY, dragging: false };
    }
  }

  #move(event: MouseEvent): void {
    const press = this.#press;
    if (press === null) {
      return;
    }
    if (event.buttons === 0) {
      this.#end();
      return;
    }
    if (!press.dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_DISTANCE_PX) {
      press.dragging = true;
      press.element.setAttribute(DRAGGING_ATTRIBUTE, '');
    }
    if (press.dragging) {
      this.#deps.onMove(press.id, event.clientX, event.clientY);
    }
  }

  #up(event: MouseEvent): void {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.document.addEventListener('click', this.#onClick, true);
      this.#deps.onDrop(press.id, event.clientX, event.clientY);
    }
    this.#end();
  }

  #end(): void {
    const press = this.#press;
    this.#press = null;
    press?.element.removeAttribute(DRAGGING_ATTRIBUTE);
    if (press?.dragging === true) {
      this.#deps.onEnd();
    }
  }

  #swallow(event: Event): void {
    this.#deps.document.removeEventListener('click', this.#onClick, true);
    event.preventDefault();
    event.stopPropagation();
  }

  #elementOf(target: EventTarget | null): HTMLElement | null {
    const element = (target as Element | null)?.closest?.(this.#deps.selector);
    const container = this.#deps.container();
    return element != null && container !== null && element.parentElement === container ? (element as HTMLElement) : null;
  }
}
