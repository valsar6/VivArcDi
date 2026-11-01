import { TabSlot } from "./TabSlot.js";
const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;
class TabPointerDrag {
  #deps;
  #press = null;
  #onDown = (event) => this.#down(event);
  #onMove = (event) => this.#move(event);
  #onUp = (event) => this.#up(event);
  /**
   * Follows a tab of Vivaldi's list being moved with the mouse: the button goes down on its row,
   * the pointer moves more than a few pixels, and the button goes up somewhere. Vivaldi sends no
   * drag events to the interface, so this reads the mouse events. It never cancels an event, so
   * Vivaldi's own drag goes on as it would without VivArcDi.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening, in the capture phase.
   */
  attach() {
    this.#deps.document.addEventListener("mousedown", this.#onDown, true);
    this.#deps.document.addEventListener("mousemove", this.#onMove, true);
    this.#deps.document.addEventListener("mouseup", this.#onUp, true);
  }
  /**
   * Stops listening and forgets a drag in progress.
   */
  detach() {
    this.#deps.document.removeEventListener("mousedown", this.#onDown, true);
    this.#deps.document.removeEventListener("mousemove", this.#onMove, true);
    this.#deps.document.removeEventListener("mouseup", this.#onUp, true);
    this.#end();
  }
  #down(event) {
    this.#press = null;
    const target = event.target;
    const tabId = event.button === PRIMARY_BUTTON && target?.closest?.(this.#deps.wrapperSelector) != null ? TabSlot.idOf(target, this.#deps.wrapperSelector) : null;
    if (tabId !== null) {
      this.#press = { tabId, x: event.clientX, y: event.clientY, dragging: false };
    }
  }
  #move(event) {
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
  #up(event) {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.onDrop(press.tabId, event.clientX, event.clientY);
    }
    if (press !== null) {
      this.#end();
    }
  }
  #end() {
    const dragging = this.#press?.dragging === true;
    this.#press = null;
    if (dragging) {
      this.#deps.onEnd();
    }
  }
}
export {
  TabPointerDrag
};
