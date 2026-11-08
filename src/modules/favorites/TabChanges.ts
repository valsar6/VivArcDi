import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';

export type TabChangesApi = Pick<BrowserTabs, 'onUpdated' | 'onActivated' | 'onRemoved' | 'onCreated'>;

export class TabChanges {
  #tabs: TabChangesApi;
  #logger: Logger;
  #onChange: () => void;
  #unsubscribe: Array<() => void> = [];

  /**
   * Calls a function whenever a tab is created, updated, activated or removed. A missing event is
   * reported once and the others keep working.
   *
   * @param tabs Tabs API.
   * @param logger Reports a missing event.
   * @param onChange Called after every change.
   */
  constructor(tabs: TabChangesApi, logger: Logger, onChange: () => void) {
    this.#tabs = tabs;
    this.#logger = logger;
    this.#onChange = onChange;
  }

  /**
   * Starts listening.
   */
  public start(): void {
    const tabs = this.#tabs;
    const read = (): void => this.#onChange();
    const events: Array<() => () => void> = [
      (): (() => void) => tabs.onUpdated(read),
      (): (() => void) => tabs.onActivated(read),
      (): (() => void) => tabs.onRemoved(read),
      (): (() => void) => tabs.onCreated(read),
    ];
    for (const subscribe of events) {
      try {
        this.#unsubscribe.push(subscribe());
      } catch {
        this.#logger.warn('A tab event is missing: tiles may lag behind the tabs');
      }
    }
  }

  /**
   * Stops listening.
   */
  public stop(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
}
