import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';

export type SubtreeWatcher = (target: Node, onChange: () => void) => () => void;

export interface KeptElementPlacement {
  /** The element that must hold the kept element, or null when it is not on screen. */
  parent: () => Element | null;
  /** The element whose changes may move the parent: a mutation below it triggers a check. */
  root: Node;
  /** Reports changes below the root, replaceable in tests. */
  watch?: SubtreeWatcher;
  /** Frame scheduling for the checks, replaceable in tests. */
  timing?: FrameTiming;
}

/**
 * Builds a watcher that reports added and removed nodes below a target, and changes of some
 * attributes.
 *
 * @param attributeFilter Attributes whose changes count too; none by default.
 * @returns The watcher, which returns a function that stops it.
 */
export const watchSubtree =
  (attributeFilter: string[] = []): SubtreeWatcher =>
  (target, onChange) => {
    const observer = new MutationObserver(onChange);
    observer.observe(target, { childList: true, subtree: true, ...(attributeFilter.length > 0 ? { attributes: true, attributeFilter } : {}) });
    return () => observer.disconnect();
  };

export class KeptElement {
  #element: HTMLElement;
  #placement: KeptElementPlacement;
  #task: FrameTask;
  #unwatch: (() => void) | null = null;

  /**
   * Keeps an element of VivArcDi as the last child of an element of Vivaldi's interface, and puts
   * it back, once per frame at most, when Vivaldi rebuilds that part of the interface.
   *
   * @param element The element to keep.
   * @param placement Where it goes and what to watch.
   */
  constructor(element: HTMLElement, placement: KeptElementPlacement) {
    this.#element = element;
    this.#placement = placement;
    this.#task = new FrameTask(() => this.sync(), placement.timing);
  }

  /**
   * Places the element and starts watching.
   */
  public start(): void {
    this.sync();
    this.#unwatch ??= (this.#placement.watch ?? watchSubtree())(this.#placement.root, () => this.#task.request());
  }

  /**
   * Puts the element at the end of its parent, or takes it away when the parent is gone.
   */
  public sync(): void {
    const parent = this.#placement.parent();
    if (parent === null) {
      this.#element.remove();
    } else if (parent.lastElementChild !== this.#element) {
      parent.append(this.#element);
    }
  }

  /**
   * Stops watching and removes the element.
   */
  public stop(): void {
    this.#unwatch?.();
    this.#unwatch = null;
    this.#task.cancel();
    this.#element.remove();
  }
}
