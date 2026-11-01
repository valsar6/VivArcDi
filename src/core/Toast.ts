export const TOAST_ATTRIBUTE = 'data-vivarcdi-toast';
export const VISIBLE_ATTRIBUTE = 'data-vivarcdi-visible';

export interface ToastTimers {
  set: (run: () => void, delayMs: number) => unknown;
  clear: (handle: unknown) => void;
}

export interface ToastDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The element that receives the toast, such as `#browser`. */
  parent: Element;
  /** How long the toast stays, in milliseconds. */
  durationMs: number;
  /** Timers, replaceable in tests. */
  timers?: ToastTimers;
}

const defaultTimers: ToastTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Toast {
  #deps: ToastDependencies;
  #timers: ToastTimers;
  #element: HTMLElement | null = null;
  #pending: unknown = null;

  /**
   * One short message at the bottom of the window, read out by screen readers. Showing a new
   * message while one is visible replaces its text and starts its time again.
   *
   * @param dependencies Everything the toast collaborates with.
   */
  constructor(dependencies: ToastDependencies) {
    this.#deps = dependencies;
    this.#timers = dependencies.timers ?? defaultTimers;
  }

  /**
   * Shows a message for the toast's duration.
   *
   * @param text The message, such as `Copied`.
   */
  public show(text: string): void {
    const element = this.#ensureElement();
    element.textContent = text;
    element.toggleAttribute(VISIBLE_ATTRIBUTE, true);
    this.#cancel();
    this.#pending = this.#timers.set(() => this.#hide(), this.#deps.durationMs);
  }

  /**
   * Cancels the timer and removes the toast from the window.
   */
  public remove(): void {
    this.#cancel();
    this.#element?.remove();
    this.#element = null;
  }

  #ensureElement(): HTMLElement {
    if (this.#element === null) {
      this.#element = this.#deps.document.createElement('div');
      this.#element.setAttribute(TOAST_ATTRIBUTE, '');
      this.#element.setAttribute('role', 'status');
      this.#deps.parent.append(this.#element);
    }
    return this.#element;
  }

  #hide(): void {
    this.#pending = null;
    this.#element?.toggleAttribute(VISIBLE_ATTRIBUTE, false);
  }

  #cancel(): void {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
