import { TabSlot } from '../../core/TabSlot.js';

export interface PointerDragDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`. */
  wrapperSelector: string;
  /** Called while a tab is dragged, with the position of the pointer. */
  onMove: (x: number, y: number) => void;
  /** Called when the button is released after a drag, with the tab and the position of the pointer. */
  onDrop: (tabId: number, x: number, y: number) => void;
  /** Called when the drag ends, dropped or not. */
  onEnd: () => void;
}

interface Press {
  tabId: number;
  x: number;
  y: number;
  dragging: boolean;
}

export type PointerEventData = Pick<MouseEvent, 'button' | 'buttons' | 'clientX' | 'clientY' | 'target'>;

const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;

export class TabPointerDrag {
  #deps: PointerDragDependencies;
  #press: Press | null = null;
  #onDown = (event: Event): void => this.#down(event as MouseEvent);
  #onMove = (event: Event): void => this.#move(event as MouseEvent);
  #onUp = (event: Event): void => this.#up(event as MouseEvent);

  /**
   * Follows a tab of Vivaldi's list being moved with the mouse: the button goes down on its row,
   * the pointer moves more than a few pixels, and the button goes up somewhere. Vivaldi sends no
   * drag events to the interface, so this reads the mouse events. It never cancels an event, so
   * Vivaldi's own drag goes on as it would without VivArcDi.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PointerDragDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    this.#deps.document.addEventListener('mousedown', this.#onDown, true);
    this.#deps.document.addEventListener('mousemove', this.#onMove, true);
    this.#deps.document.addEventListener('mouseup', this.#onUp, true);
  }

  /**
   * Stops listening and forgets a drag in progress.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('mousedown', this.#onDown, true);
    this.#deps.document.removeEventListener('mousemove', this.#onMove, true);
    this.#deps.document.removeEventListener('mouseup', this.#onUp, true);
    this.#end();
  }

  #down(event: PointerEventData): void {
    this.#press = null;
    const target = event.target as Element | null;
    const tabId = event.button === PRIMARY_BUTTON && target?.closest?.(this.#deps.wrapperSelector) != null ? TabSlot.idOf(target, this.#deps.wrapperSelector) : null;
    if (tabId !== null) {
      this.#press = { tabId, x: event.clientX, y: event.clientY, dragging: false };
    }
  }

  #move(event: PointerEventData): void {
    const press = this.#press;
    if (press === null) {
      return;
    }
    if (event.buttons === 0) {
      this.#end();
      return;
    }
    press.dragging = press.dragging || Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_DISTANCE_PX;
    if (press.dragging) {
      this.#deps.onMove(event.clientX, event.clientY);
    }
  }

  #up(event: PointerEventData): void {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.onDrop(press.tabId, event.clientX, event.clientY);
    }
    if (press !== null) {
      this.#end();
    }
  }

  #end(): void {
    const dragging = this.#press?.dragging === true;
    this.#press = null;
    if (dragging) {
      this.#deps.onEnd();
    }
  }
}
