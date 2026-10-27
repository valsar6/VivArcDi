const FOLDER_ROW = "[data-vivarcdi-folder-id]";
const PANEL = "[data-vivarcdi-preview]";
const OPEN_MARK = "data-vivarcdi-open";
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class FolderHover {
  #document;
  #delayMs;
  #handlers;
  #timers;
  #pending = null;
  #current = null;
  #listener = (event) => this.#moved(event);
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
  constructor(document, delayMs, handlers, timers = defaultTimers) {
    this.#document = document;
    this.#delayMs = delayMs;
    this.#handlers = handlers;
    this.#timers = timers;
  }
  /**
   * Starts listening.
   */
  start() {
    this.#document.addEventListener("mouseover", this.#listener);
  }
  /**
   * Stops listening and cancels what is waiting.
   */
  stop() {
    this.#document.removeEventListener("mouseover", this.#listener);
    this.#cancel();
    this.#current = null;
  }
  /**
   * Tells the watcher that the panel was closed by something else, such as Esc or a click.
   */
  closed() {
    this.#cancel();
    this.#current = null;
  }
  #moved(event) {
    if (event.buttons !== 0) {
      return;
    }
    const target = event.target;
    const row = target?.closest(FOLDER_ROW) ?? null;
    if (row !== null && !row.hasAttribute(OPEN_MARK)) {
      this.#rest(row);
    } else if (target?.closest(PANEL) != null) {
      this.#cancel();
    } else {
      this.#leave();
    }
  }
  #rest(row) {
    const folderId = row.getAttribute("data-vivarcdi-folder-id");
    if (folderId === null || folderId === this.#current) {
      this.#cancel();
      return;
    }
    this.#after(() => {
      this.#current = folderId;
      this.#handlers.onOpen(folderId, row);
    });
  }
  #leave() {
    if (this.#current !== null) {
      this.#after(() => {
        this.#current = null;
        this.#handlers.onClose();
      });
    } else {
      this.#cancel();
    }
  }
  #after(run) {
    this.#cancel();
    this.#pending = this.#timers.set(() => {
      this.#pending = null;
      run();
    }, this.#delayMs);
  }
  #cancel() {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
export {
  FolderHover
};
