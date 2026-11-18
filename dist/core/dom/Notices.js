const NOTICE_MS = 8e3;
class Notices {
  #toast;
  #seen = /* @__PURE__ */ new Set();
  /**
   * The one place where the window tells the user something. Every notice goes through one toast,
   * so two notices never stack.
   *
   * @param toast The window's shared toast.
   */
  constructor(toast) {
    this.#toast = toast;
  }
  /**
   * Shows a message now, every time it is called.
   *
   * @param text The message.
   * @param kind The icon of the message: `ok` by default.
   */
  show(text, kind = "ok") {
    this.#toast.show(text, kind);
  }
  /**
   * Shows a message the first time the key is seen in this window, and nothing afterwards.
   *
   * @param key What identifies the message for the session.
   * @param text The message.
   * @param kind The icon of the message: `ok` by default.
   */
  once(key, text, kind = "ok") {
    if (this.#seen.has(key)) {
      return;
    }
    this.#seen.add(key);
    this.show(text, kind);
  }
  /** Takes the shared toast out of the window. */
  remove() {
    this.#toast.remove();
  }
}
export {
  NOTICE_MS,
  Notices
};
