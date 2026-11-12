import { FrameTask } from '../../core/FrameTask.js';
import type { FrameTiming } from '../../core/FrameTask.js';

const DEFAULT_FRAMES = 30;

export class AddressField {
  #document: Document;
  #selector: string;
  #framesLeft = 0;
  #maxFrames: number;
  #task: FrameTask;

  /**
   * Vivaldi's address field. A new tab may show it a few frames after the tab exists, so a search
   * for it repeats on the next frames for a fixed time, then gives up without a word.
   *
   * @param document The browser window document.
   * @param selector Selector of the field, `addressField` in the catalog.
   * @param timing Frame scheduling, replaceable in tests.
   * @param maxFrames How many frames to wait for the field.
   */
  constructor(document: Document, selector: string, timing: FrameTiming = {}, maxFrames = DEFAULT_FRAMES) {
    this.#document = document;
    this.#selector = selector;
    this.#maxFrames = maxFrames;
    this.#task = new FrameTask(() => this.#attempt(), timing);
  }

  /**
   * Puts the cursor in the address field and selects its text, as soon as the field is on screen.
   */
  public focus(): void {
    this.#task.cancel();
    this.#framesLeft = this.#maxFrames;
    this.#attempt();
  }

  /**
   * Stops waiting for the field.
   */
  public stop(): void {
    this.#task.cancel();
  }

  #attempt(): void {
    const field = this.#document.querySelector<HTMLInputElement>(this.#selector);
    if (field !== null) {
      field.focus();
      field.select();
    } else if (this.#framesLeft > 0) {
      this.#framesLeft -= 1;
      this.#task.request();
    }
  }
}
