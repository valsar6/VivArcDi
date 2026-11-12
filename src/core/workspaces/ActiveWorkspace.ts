import type { BrowserTabs } from './BrowserTabs.js';
import type { Logger } from './Logger.js';
import { TabData } from './TabData.js';

export type ActiveWorkspaceTabs = Pick<BrowserTabs, 'query' | 'onActivated' | 'onUpdated'>;

export class ActiveWorkspace {
  #tabs: ActiveWorkspaceTabs;
  #onChange: (workspaceId: string | null) => void;
  #logger: Logger;
  #current: string | null = null;
  #generation = 0;
  #unsubscribe: Array<() => void> = [];

  /**
   * Follows the workspace of the active tab of the window and reports it when it changes. While no
   * tab is active the last known workspace stays, so the section does not flicker during a switch.
   *
   * @param tabs Tabs API.
   * @param onChange Called with the new workspace id, or null outside any workspace.
   * @param logger Logger for failures.
   */
  constructor(tabs: ActiveWorkspaceTabs, onChange: (workspaceId: string | null) => void, logger: Logger) {
    this.#tabs = tabs;
    this.#onChange = onChange;
    this.#logger = logger;
  }

  /**
   * @returns The workspace id of the active tab, or null outside any workspace.
   */
  public get current(): string | null {
    return this.#current;
  }

  /**
   * Reads the workspace now, without reporting it, and starts following the tabs. Throws when a
   * tab event is missing.
   */
  public async start(): Promise<void> {
    this.#unsubscribe = [
      this.#tabs.onActivated(() => void this.refresh()),
      this.#tabs.onUpdated((_id, change) => {
        if ('vivExtData' in change) {
          void this.refresh();
        }
      }),
    ];
    const workspace = await this.#read();
    if (workspace !== undefined) {
      this.#current = workspace;
    }
  }

  /**
   * Stops following the tabs.
   */
  public stop(): void {
    this.#generation += 1;
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }

  /**
   * Reads the workspace of the active tab and reports a change.
   */
  public async refresh(): Promise<void> {
    const generation = ++this.#generation;
    const workspace = await this.#read();
    if (generation === this.#generation && workspace !== undefined && workspace !== this.#current) {
      this.#current = workspace;
      this.#onChange(workspace);
    }
  }

  async #read(): Promise<string | null | undefined> {
    try {
      const [active] = await this.#tabs.query({ active: true, currentWindow: true });
      return active === undefined ? undefined : TabData.of(active);
    } catch (error) {
      this.#logger.warn('could not read the active workspace', error);
      return undefined;
    }
  }
}
