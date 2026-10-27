import { SerialTask } from "../../core/SerialTask.js";
class ActiveTab {
  #tabs;
  #tab = null;
  #read;
  #unsubscribe = [];
  /**
   * Keeps the active tab of the window at hand, so a key press can be judged synchronously.
   *
   * @param tabs Tabs API.
   * @param onError Called when reading the active tab fails.
   */
  constructor(tabs, onError) {
    this.#tabs = tabs;
    this.#read = new SerialTask(async () => {
      const [tab] = await this.#tabs.query({ active: true, currentWindow: true });
      this.#tab = tab ?? null;
    }, onError);
  }
  /**
   * @returns The id of the active tab when it is pinned, otherwise null.
   */
  get pinnedId() {
    return this.#tab?.pinned === true ? this.#tab.id ?? null : null;
  }
  /**
   * Reads the active tab and follows activations and pins.
   */
  async start() {
    this.#unsubscribe.push(this.#tabs.onActivated(() => this.#read.request()));
    this.#unsubscribe.push(
      this.#tabs.onUpdated((tabId, change) => {
        if (tabId === this.#tab?.id && change.pinned !== void 0) {
          this.#read.request();
        }
      })
    );
    this.#read.request();
    await this.#read.idle();
  }
  /**
   * Stops following the tabs.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
}
export {
  ActiveTab
};
