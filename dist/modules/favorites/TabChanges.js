class TabChanges {
  #tabs;
  #logger;
  #onChange;
  #unsubscribe = [];
  /**
   * Calls a function whenever a tab is created, updated, activated or removed. A missing event is
   * reported once and the others keep working.
   *
   * @param tabs Tabs API.
   * @param logger Reports a missing event.
   * @param onChange Called after every change.
   */
  constructor(tabs, logger, onChange) {
    this.#tabs = tabs;
    this.#logger = logger;
    this.#onChange = onChange;
  }
  /**
   * Starts listening.
   */
  start() {
    const tabs = this.#tabs;
    const read = () => this.#onChange();
    const events = [
      () => tabs.onUpdated(read),
      () => tabs.onActivated(read),
      () => tabs.onRemoved(read),
      () => tabs.onCreated(read)
    ];
    for (const subscribe of events) {
      try {
        this.#unsubscribe.push(subscribe());
      } catch {
        this.#logger.warn("A tab event is missing: tiles may lag behind the tabs");
      }
    }
  }
  /**
   * Stops listening.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
}
export {
  TabChanges
};
