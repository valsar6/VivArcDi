const TOAST_ATTRIBUTE = "data-vivarcdi-toast";
const VISIBLE_ATTRIBUTE = "data-vivarcdi-visible";
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class Toast {
  #deps;
  #timers;
  #element = null;
  #pending = null;
  /**
   * One short message at the bottom of the window, read out by screen readers. Showing a new
   * message while one is visible replaces its text and starts its time again.
   *
   * @param dependencies Everything the toast collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#timers = dependencies.timers ?? defaultTimers;
  }
  /**
   * Shows a message for the toast's duration.
   *
   * @param text The message, such as `Copied`.
   */
  show(text) {
    const element = this.#ensureElement();
    element.textContent = text;
    element.toggleAttribute(VISIBLE_ATTRIBUTE, true);
    this.#cancel();
    this.#pending = this.#timers.set(() => this.#hide(), this.#deps.durationMs);
  }
  /**
   * Cancels the timer and removes the toast from the window.
   */
  remove() {
    this.#cancel();
    this.#element?.remove();
    this.#element = null;
  }
  #ensureElement() {
    if (this.#element === null) {
      this.#element = this.#deps.document.createElement("div");
      this.#element.setAttribute(TOAST_ATTRIBUTE, "");
      this.#element.setAttribute("role", "status");
      this.#deps.parent.append(this.#element);
    }
    return this.#element;
  }
  #hide() {
    this.#pending = null;
    this.#element?.toggleAttribute(VISIBLE_ATTRIBUTE, false);
  }
  #cancel() {
    if (this.#pending !== null) {
      this.#timers.clear(this.#pending);
      this.#pending = null;
    }
  }
}
export {
  TOAST_ATTRIBUTE,
  Toast,
  VISIBLE_ATTRIBUTE
};
