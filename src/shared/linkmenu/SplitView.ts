import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import type { MenuItem } from '../../core/dom/ContextMenu.js';
import type { ToastKind } from '../../core/dom/Toast.js';
import type { Logger } from '../../core/support/Logger.js';
import { TabData } from '../../core/tabs/TabData.js';
import { WorkspaceTabs } from '../../core/workspaces/WorkspaceTabs.js';
import { AddressField } from '../newtab/AddressField.js';
import { NewTabOpener } from '../newtab/NewTabOpener.js';
import { OPEN_IN_SPLIT_VIEW_LABEL } from '../tabs/CommandLabels.js';
import { TabTiler } from '../tabs/TabTiler.js';
import { BlankTabWatch } from './BlankTabWatch.js';
import { LinkedTab } from './LinkedTab.js';

export const SPLIT_FAILED_TEXT = 'Could not open the split view';

export type SplitViewTabs = Pick<BrowserTabs, 'available' | 'query' | 'get' | 'create' | 'update' | 'remove' | 'discard' | 'onUpdated' | 'onRemoved'>;

export interface SplitViewDeps {
  tabs: SplitViewTabs;
  newTab: Pick<NewTabOpener, 'create'>;
  bookmarks: Pick<BookmarkWriter, 'get'>;
  address: Pick<AddressField, 'focus'>;
  tiler: Pick<TabTiler, 'tile' | 'untile'>;
  linked: Pick<LinkedTab, 'of'>;
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class SplitView {
  #deps: SplitViewDeps;
  #workspaceTabs: WorkspaceTabs;
  #blank: BlankTabWatch;
  #warned = false;

  /**
   * The `Open in Split View` command of a link row: tiles the page of the row, on the left, with the
   * selected ordinary tab, or, when the selected tab is a Favorites tile tab or there is none, with a
   * new blank tab on the right, and opens the address bar on that blank tab.
   *
   * @param deps What it reads and drives.
   */
  constructor(deps: SplitViewDeps) {
    this.#deps = deps;
    this.#workspaceTabs = new WorkspaceTabs(deps.tabs, deps.logger);
    this.#blank = new BlankTabWatch(deps.tabs);
  }

  /**
   * @param context What the module may use.
   * @param notify Shows a toast.
   * @returns The command wired to the services of the module.
   */
  public static of(context: ModuleContext, notify: (text: string, kind?: ToastKind) => void): SplitView {
    const { document, selectors, tabs, runtime, bookmarkWriter, logger } = context;
    const address = new AddressField(document, selectors.get('addressField'));
    return new SplitView({
      tabs,
      newTab: new NewTabOpener(tabs, runtime, address),
      bookmarks: bookmarkWriter,
      address,
      tiler: new TabTiler(tabs),
      linked: new LinkedTab(tabs),
      notify,
      logger: logger.child('SplitView'),
    });
  }

  /**
   * @param linkId The bookmark id of the link row.
   * @returns The menu item, disabled when the row is the selected tab or already tiled with it; null,
   * logged once, when tiling cannot be driven.
   */
  public async item(linkId: string): Promise<MenuItem | null> {
    if (!this.#deps.tabs.available) {
      this.#warnOnce('chrome.tabs is not available');
      return null;
    }
    const [selected, row] = await Promise.all([this.#selected(), this.#deps.linked.of(linkId)]);
    return { label: OPEN_IN_SPLIT_VIEW_LABEL, run: (): void => void this.open(linkId), disabled: SplitView.#together(selected, row) };
  }

  /**
   * Tiles the page of the row, on the left, with the selected ordinary tab, or, without one, with a
   * new blank tab on the right whose address bar opens. A failure is logged and shown as an error toast.
   *
   * @param linkId The bookmark id of the link row.
   */
  public async open(linkId: string): Promise<void> {
    this.#blank.stop();
    try {
      const selected = await this.#selected();
      const row = await this.#rowTab(linkId, selected);
      if (selected?.id === undefined || TabData.ownOf(selected).favoriteId !== undefined) {
        await this.#tileWithBlank(row);
      } else {
        await this.#deps.tiler.tile([row, selected.id]);
      }
    } catch (error) {
      this.#deps.logger.warn('could not open the split view', error);
      this.#deps.notify(SPLIT_FAILED_TEXT, 'error');
    }
  }

  /**
   * Stops waiting for a blank tab.
   */
  public stop(): void {
    this.#blank.stop();
  }

  async #selected(): Promise<chrome.tabs.Tab | undefined> {
    return (await this.#deps.tabs.query({ active: true, currentWindow: true }))[0];
  }

  async #rowTab(linkId: string, selected: chrome.tabs.Tab | undefined): Promise<number> {
    const existing = await this.#deps.linked.of(linkId);
    const tab = existing ?? (await this.#open(linkId, selected));
    if (tab.id === undefined) {
      throw new Error('the tab of the row has no id');
    }
    return tab.id;
  }

  async #open(linkId: string, selected: chrome.tabs.Tab | undefined): Promise<chrome.tabs.Tab> {
    const { url } = await this.#deps.bookmarks.get(linkId);
    if (url === undefined) {
      throw new Error('the row has no address');
    }
    return this.#workspaceTabs.open(url, selected === undefined ? null : TabData.of(selected), { bookmarkId: linkId });
  }

  async #tileWithBlank(row: number): Promise<void> {
    const blank = await this.#deps.newTab.create();
    if (blank.id === undefined) {
      throw new Error('the blank tab has no id');
    }
    await this.#deps.tiler.tile([row, blank.id]);
    this.#blank.start(blank.id, () => void this.#undo(row));
    this.#deps.address.focus();
  }

  async #undo(row: number): Promise<void> {
    try {
      await this.#deps.tiler.untile([row]);
    } catch (error) {
      this.#deps.logger.warn('could not undo the split view', error);
    }
  }

  #warnOnce(reason: string): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(`Open in Split View is off: ${reason}`);
    }
  }

  static #together(selected: chrome.tabs.Tab | undefined, row: chrome.tabs.Tab | undefined): boolean {
    if (selected === undefined || row === undefined) {
      return false;
    }
    const group = SplitView.#groupOf(selected);
    return selected.id === row.id || (group !== undefined && group === SplitView.#groupOf(row));
  }

  static #groupOf(tab: chrome.tabs.Tab): unknown {
    const tiling = TabData.extDataOf(tab)['tiling'];
    return typeof tiling === 'object' && tiling !== null ? (tiling as { id?: unknown }).id : undefined;
  }
}
