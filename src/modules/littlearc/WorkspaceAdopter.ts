import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { BrowserWindows } from '../../core/browser/BrowserWindows.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabData } from '../../core/tabs/TabData.js';
import { TabDataWriter } from '../../core/tabs/TabDataWriter.js';
import type { DestinationPicker } from './DestinationPicker.js';
import { destinationAnswer } from './LittleArcMessage.js';
import type { AdoptMessage, DestinationAnswer, DestinationColors } from './LittleArcMessage.js';

export type AdopterTabs = Pick<BrowserTabs, 'get' | 'update' | 'move' | 'activate'>;

export interface DestinationSource {
  nameOf: (workspace: string | null) => string | null;
  colors: () => DestinationColors | null;
}

const NO_DESTINATION: DestinationSource = { nameOf: (): null => null, colors: (): null => null };

export interface AdopterDependencies {
  tabs: AdopterTabs;
  windows: Pick<BrowserWindows, 'lastFocused' | 'remove'>;
  windowId: number;
  recentWorkspace: () => string | null;
  picker: Pick<DestinationPicker, 'pick'>;
  destination?: DestinationSource | undefined;
  logger: Logger;
}

export class WorkspaceAdopter {
  #tabs: AdopterTabs;
  #windows: Pick<BrowserWindows, 'lastFocused' | 'remove'>;
  #windowId: number;
  #recentWorkspace: () => string | null;
  #picker: Pick<DestinationPicker, 'pick'>;
  #destination: DestinationSource;
  #logger: Logger;

  /**
   * Takes the page of a Little Arc window into this window, as a tab of the most recent workspace.
   * Every normal window receives the request; only the one that was in front answers.
   *
   * @param dependencies The tabs and windows APIs, the id of this window, what it last showed,
   * the destination picker, where the name and colors of the destination come from, and a logger.
   */
  constructor({ tabs, windows, windowId, recentWorkspace, picker, destination, logger }: AdopterDependencies) {
    this.#tabs = tabs;
    this.#windows = windows;
    this.#windowId = windowId;
    this.#recentWorkspace = recentWorkspace;
    this.#picker = picker;
    this.#destination = destination ?? NO_DESTINATION;
    this.#logger = logger;
  }

  /**
   * Moves the tab into this window, if this is the window that was in front, then closes the
   * Little Arc window.
   *
   * @param message The request of a Little Arc window.
   * @returns Whether this window took the tab.
   */
  public async adopt(message: AdoptMessage): Promise<boolean> {
    try {
      if ((await this.#windows.lastFocused(['normal'])).id !== this.#windowId) {
        return false;
      }
      const workspace = await this.#picker.pick(this.#recentWorkspace(), []);
      await this.#tabs.move(message.tabId, { windowId: this.#windowId, index: -1 });
      await this.#store(message.tabId, workspace);
      await this.#tabs.activate(message.tabId);
      await this.#windows.remove(message.windowId).catch(() => undefined);
      return true;
    } catch (error) {
      this.#logger.error('could not move the Little Arc page into the window', error);
      return false;
    }
  }

  /**
   * Answers the question of a Little Arc bar: the name of the workspace that `adopt` would pick and
   * its colors, if this is the window that was in front.
   *
   * @returns The answer, or null when another window was in front or the workspace cannot be read.
   */
  public async describeDestination(): Promise<DestinationAnswer | null> {
    try {
      if ((await this.#windows.lastFocused(['normal'])).id !== this.#windowId) {
        return null;
      }
      const workspace = await this.#picker.pick(this.#recentWorkspace(), []);
      return destinationAnswer(this.#destination.nameOf(workspace), this.#destination.colors());
    } catch (error) {
      this.#logger.warn('could not describe the destination workspace', error);
      return null;
    }
  }

  async #store(tabId: number, workspace: string | null): Promise<void> {
    if (workspace === null) {
      return;
    }
    try {
      const extra = { workspaceId: TabData.rawWorkspace(workspace) };
      await TabDataWriter.of(this.#tabs).write(tabId, (tab) => TabData.withOwn(tab, {}, extra));
    } catch (error) {
      this.#logger.warn('could not store the workspace of the moved tab', error);
    }
  }
}
