import { FrameTask } from "../../core/FrameTask.js";
const DEFAULT_FRAMES = 30;
class AddressField {
  #document;
  #selector;
  #framesLeft = 0;
  #maxFrames;
  #task;
  /**
   * Vivaldi's address field. A new tab may show it a few frames after the tab exists, so a search
   * for it repeats on the next frames for a fixed time, then gives up without a word.
   *
   * @param document The browser window document.
   * @param selector Selector of the field, `addressField` in the catalog.
   * @param timing Frame scheduling, replaceable in tests.
   * @param maxFrames How many frames to wait for the field.
   */
  constructor(document, selector, timing = {}, maxFrames = DEFAULT_FRAMES) {
    this.#document = document;
    this.#selector = selector;
    this.#maxFrames = maxFrames;
    this.#task = new FrameTask(() => this.#attempt(), timing);
  }
  /**
   * Puts the cursor in the address field and selects its text, as soon as the field is on screen.
   */
  focus() {
    this.#task.cancel();
    this.#framesLeft = this.#maxFrames;
    this.#attempt();
  }
  /**
   * Stops waiting for the field.
   */
  stop() {
    this.#task.cancel();
  }
  #attempt() {
    const field = this.#document.querySelector(this.#selector);
    if (field !== null) {
      field.focus();
      field.select();
    } else if (this.#framesLeft > 0) {
      this.#framesLeft -= 1;
      this.#task.request();
    }
  }
}
export {
  AddressField
};
