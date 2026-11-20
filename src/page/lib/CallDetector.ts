import { CallVideo } from './CallVideo.js';

const POLL_MS = 1000;

export class CallDetector {
  #root: ParentNode;
  #selector: string;
  #onChange: (inCall: boolean) => void;
  #timer: ReturnType<typeof setInterval> | null = null;
  #active = false;

  /**
   * Follows whether a page shows a call in progress: the site's in-call view is there and a video
   * plays a live track.
   *
   * @param root The document of the page.
   * @param selector Selector that matches only while the page shows a call.
   * @param onChange Called with the new state each time it changes.
   */
  constructor(root: ParentNode, selector: string, onChange: (inCall: boolean) => void) {
    this.#root = root;
    this.#selector = selector;
    this.#onChange = onChange;
  }

  /**
   * @returns Whether a call is in progress now.
   */
  public inCall(): boolean {
    return this.#root.querySelector(this.#selector) !== null && CallVideo.pick(this.#root) !== null;
  }

  /**
   * Starts checking once a second.
   */
  public start(): void {
    this.check();
    this.#timer = setInterval(() => this.check(), POLL_MS);
  }

  /**
   * Stops checking.
   */
  public stop(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
    }
    this.#timer = null;
  }

  /**
   * Compares the page with the last state and reports a change.
   */
  public check(): void {
    const now = this.inCall();
    if (now !== this.#active) {
      this.#active = now;
      this.#onChange(now);
    }
  }
}
