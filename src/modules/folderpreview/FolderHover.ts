export interface HoverTimers {
  set: (run: () => void, delayMs: number) => unknown;
  clear: (handle: unknown) => void;
}

export interface HoverHandlers {
  /** Called when the pointer has rested on a closed folder row. */
  onOpen: (folderId: string, row: HTMLElement) => void;
  /** Called when the pointer has left the folder and the panel for the delay. */
  onClose: () => void;
}

const FOLDER_ROW = '[data-vivarcdi-folder-id]';
const PANEL = '[data-vivarcdi-preview]';
const OPEN_MARK = 'data-vivarcdi-open';

const defaultTimers: HoverTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class FolderHover {
  #document: Document;
  #delayMs: number;
  #handlers: HoverHandlers;
  #timers: HoverTimers;
  #pending: unknown = null;
  #current: string | null = null;
  #listener = (event: Event): void => this.#moved(event as MouseEvent);

  /**
   * Turns the pointer movement over the folder rows into "rest" and "leave" calls. Uses one
   * listener on the document and looks the rows up on every move, so it keeps working when the
   * rows are drawn again.
   *
   * @param document The browser window document.
   * @param delayMs How long the pointer must rest, and how long it may be away, in milliseconds.
   * @param handlers What to do on rest and on leave.
   * @param timers Timers, replaceable in tests.
   */
  constructor(document: Document, delayMs: number, handlers: HoverHandlers, timers: HoverTimers = defaultTimers) {
    this.#document = document;
    this.#delayMs = delayMs;
    this.#handlers = handlers;
    this.#timers = timers;
  }

  /**
   * Starts listening.
   */
  public start(): void {
    this.#document.addEventListener('mouseover', this.#listener);
  }

  /**
   * Stops listening and cancels what is waiting.
   */
  public stop(): void {
    this.#document.removeEventListener('mouseover', this.#listener);
    this.#cancel();
    this.#current = null;
  }

  /**
   * Tells the watcher that the panel was closed by something else, such as Esc or a click.
   */
  public closed(): void {
    this.#cancel();
    this.#current = null;
  }

  #moved(event: MouseEvent): void {
    if (event.buttons !== 0) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>(FOLDER_ROW) ?? null;
    if (row !== null && !row.hasAttribute(OPEN_MARK)) {
      this.#rest(row);
    } else if (target?.closest(PANEL) != null) {
      this.#cancel();
    } else {
      this.#leave();
    }
  }

  #rest(row: HTMLElement): void {
    const folderId = row.getAttribute('data-vivarcdi-folder-id');
    if (folderId === null || folderId === this.#current) {
      this.#cancel();
      return;
    }
    this.#after(() => {
      this.#current = folderId;
      this.#handlers.onOpen(folderId, row);
    });
  }

  #leave(): void {
    if (this.#current !== null) {
      this.#after(() => {
        this.#current = null;
        this.#handlers.onClose();
      });
    } else {
      this.#cancel();
    }
  }

  #after(run: () => void): void {
    this.#cancel();
    this.#pending = this.#timers.set(() => {
      this.#pending = null;
      run();
    }, this.#delayMs);
  }

  #cancel(): void {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
