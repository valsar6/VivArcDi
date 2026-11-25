import type { BrowserTabs } from '../browser/BrowserTabs.js';
import type { Logger } from '../support/Logger.js';
import { InspectionTarget } from '../tabs/InspectionTarget.js';
import { TabData } from '../tabs/TabData.js';

export type ActiveWorkspaceTabs = Pick<BrowserTabs, 'query' | 'onActivated' | 'onUpdated' | 'onRemoved'>;

/** Called with the workspace to show, or null for the area outside any workspace. */
export type WorkspaceListener = (workspaceId: string | null) => void;

/**
 * The one workspace state of a window: which workspace the header, the folders, the links and the
 * pinned tiles show. The selected workspace stays through an inspection page, a tab removal and a
 * tab naming an unknown workspace, so the surfaces do not flicker in the middle of a gesture.
 */
export class ActiveWorkspace {
  #tabs: ActiveWorkspaceTabs;
  #logger: Logger;
  #listed: (workspaceId: string) => boolean;
  #current: string | null = null;
  #generation = 0;
  #holds = 0;
  #listeners = new Set<WorkspaceListener>();
  #unsubscribe: Array<() => void> = [];
  #warnedUnlisted = false;

  /**
   * Follows the workspace of the active tab of the window and reports it when it changes.
   *
   * @param tabs Tabs API.
   * @param logger Logger for failures.
   * @param listed Says whether Vivaldi lists a workspace id; an id it does not list keeps the last
   * workspace. Every id is accepted when the list cannot be read.
   */
  constructor(tabs: ActiveWorkspaceTabs, logger: Logger, listed: (workspaceId: string) => boolean = () => true) {
    this.#tabs = tabs;
    this.#logger = logger;
    this.#listed = listed;
  }

  /**
   * @returns The workspace to show, or null outside any workspace.
   */
  public get current(): string | null {
    return this.#current;
  }

  /**
   * Follows a change of the workspace.
   *
   * @param listener Called with the new workspace id, or null outside any workspace.
   * @returns A function that removes the listener.
   */
  public onChange(listener: WorkspaceListener): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  /**
   * Reads the workspace now, without reporting it, and starts following the tabs. Does nothing
   * when it already follows them. Throws when a tab event is missing.
   */
  public async start(): Promise<void> {
    if (this.#unsubscribe.length > 0) {
      return;
    }
    this.#unsubscribe = [
      this.#tabs.onActivated(() => void this.refresh()),
      this.#tabs.onUpdated((_id, change) => {
        if ('vivExtData' in change) {
          void this.refresh();
        }
      }),
      this.#tabs.onRemoved(() => void this.refresh()),
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
   * Stops following the tabs while a gesture closes them, so the activation Vivaldi performs on
   * its own after a removal does not move the shown workspace. Reads that land from now on are
   * dropped until the matching `release`.
   */
  public hold(): void {
    this.#holds += 1;
    this.#generation += 1;
  }

  /**
   * Follows the tabs again after a `hold`, so a later activation changes the workspace as usual.
   */
  public release(): void {
    this.#holds = Math.max(0, this.#holds - 1);
  }

  /**
   * Reads the workspace of the active tab and reports a change. Does nothing while held.
   */
  public async refresh(): Promise<void> {
    if (this.#holds > 0) {
      return;
    }
    const generation = ++this.#generation;
    const workspace = await this.#read();
    if (generation === this.#generation && workspace !== undefined && workspace !== this.#current) {
      this.#current = workspace;
      this.#listeners.forEach((listener) => listener(workspace));
    }
  }

  async #read(): Promise<string | null | undefined> {
    try {
      const [active] = await this.#tabs.query({ active: true, currentWindow: true });
      if (active === undefined || InspectionTarget.is(active.url ?? active.pendingUrl)) {
        return undefined;
      }
      const workspace = TabData.of(active);
      if (workspace !== null && !this.#listed(workspace)) {
        this.#warnUnlisted(workspace);
        return undefined;
      }
      return workspace;
    } catch (error) {
      this.#logger.warn('could not read the active workspace', error);
      return undefined;
    }
  }

  #warnUnlisted(workspaceId: string): void {
    if (!this.#warnedUnlisted) {
      this.#warnedUnlisted = true;
      this.#logger.warn('the active tab names a workspace Vivaldi does not list', `${workspaceId}: keeping the last one`);
    }
  }
}
