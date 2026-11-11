import { TabEntries } from './TabEntries.js';
import { TabPointerDrag } from './TabPointerDrag.js';

/** A place where a dragged tab can be released, found by the position of the pointer. */
export interface TabDragPlace<Target> {
  /** The target under a point of the window, or null. */
  at(x: number, y: number): Target | null;
  /** Marks the target while a tab is over it; null unmarks. */
  mark(target: Target | null): void;
  /** Removes every mark. */
  clear(): void;
  /** Called once when the tab is released over a target. */
  release(tabId: number, target: Target): void;
}

export interface TabDragReleaseDependencies<Target> {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper, which carries `data-id="tab-<id>"`. */
  wrapperSelector: string;
  place: TabDragPlace<Target>;
  /** Called while a tab is dragged, with the point of the pointer, by the mouse and by the HTML5 drag. */
  onDrag?: (tabId: number, x: number, y: number) => void;
  /** Called when the drag ends, released or not. */
  onEnd?: () => void;
}

type DragHandler = (event: Event) => void;

export class TabDragRelease<Target> {
  #deps: TabDragReleaseDependencies<Target>;
  #drag: TabPointerDrag;
  #handled: number | null = null;
  #onDragOver: DragHandler = (event) => this.#over(event as DragEvent);
  #onDrop: DragHandler = (event) => this.#drop(event as DragEvent);
  #onLeave: DragHandler = () => this.#deps.place.clear();
  #onDragEnd: DragHandler = () => this.#finish();

  /**
   * Lets a tab of Vivaldi's list be released over a place. The tab is followed with the mouse, and
   * when Vivaldi turns the drag into an HTML5 one, which carries `vivaldi/x-tab-entries` and sends
   * no mouse events, the `dragover` and `drop` over a target are accepted so the drag is not
   * cancelled. Both ways end in `release`, at most once for each press of the mouse. Drags that
   * carry no tab are left alone. `onDrag` and `onEnd` follow either kind of drag, for the pill.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabDragReleaseDependencies<Target>) {
    this.#deps = dependencies;
    const { document, wrapperSelector, place } = dependencies;
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y): void => this.#moved(x, y),
      onDrop: (_tabId, x, y): void => this.#release(place.at(x, y)),
      onEnd: (): void => this.#finish(),
    });
  }

  /**
   * Starts following the mouse and the HTML5 drag events, in the capture phase.
   */
  public start(): void {
    const { document } = this.#deps;
    this.#drag.attach();
    document.addEventListener('dragover', this.#onDragOver, true);
    document.addEventListener('drop', this.#onDrop, true);
    document.addEventListener('dragleave', this.#onLeave, true);
    document.addEventListener('dragend', this.#onDragEnd, true);
  }

  /**
   * Stops following the mouse and the drag events, and removes the marks.
   */
  public stop(): void {
    const { document, place } = this.#deps;
    this.#drag.detach();
    document.removeEventListener('dragover', this.#onDragOver, true);
    document.removeEventListener('drop', this.#onDrop, true);
    document.removeEventListener('dragleave', this.#onLeave, true);
    document.removeEventListener('dragend', this.#onDragEnd, true);
    place.clear();
  }

  #moved(x: number, y: number): void {
    this.#deps.place.mark(this.#deps.place.at(x, y));
    this.#feed(x, y);
  }

  #feed(x: number, y: number): void {
    const press = this.#drag.lastPress;
    if (press !== null) {
      this.#deps.onDrag?.(press.tabId, x, y);
    }
  }

  #finish(): void {
    this.#deps.place.clear();
    this.#deps.onEnd?.();
  }

  #over(event: DragEvent): void {
    if (!TabEntries.carriedBy(event.dataTransfer)) {
      return;
    }
    this.#feed(event.clientX, event.clientY);
    const target = this.#targetOf(event);
    if (target === null) {
      this.#deps.place.clear();
      return;
    }
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.#deps.place.mark(target);
  }

  #drop(event: DragEvent): void {
    const target = this.#targetOf(event);
    this.#finish();
    if (target !== null) {
      event.preventDefault();
      this.#release(target);
    }
  }

  #targetOf(event: DragEvent): Target | null {
    return TabEntries.carriedBy(event.dataTransfer) ? this.#deps.place.at(event.clientX, event.clientY) : null;
  }

  #release(target: Target | null): void {
    const press = this.#drag.lastPress;
    if (target === null || press === null || press.serial === this.#handled) {
      return;
    }
    this.#handled = press.serial;
    this.#deps.place.release(press.tabId, target);
  }
}
