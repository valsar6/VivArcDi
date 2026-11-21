import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { BrowserPrefs } from '../../core/browser/BrowserPrefs.js';
import type { CommandItem } from '../../core/dom/ContextMenu.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';
import type { Logger } from '../../core/support/Logger.js';
import { PanelBar } from './panels/PanelBar.js';
import type { PanelDocument } from './panels/PanelBar.js';
import { WebPanelForm } from './panels/WebPanelForm.js';
import { WebPanelList } from './panels/WebPanelList.js';
import { OPEN_WEB_PANEL_LABEL, SHOW_WEB_PANEL_LABEL } from '../../shared/tabs/CommandLabels.js';

export interface TileWebPanelsDependencies {
  writer: Pick<BookmarkWriter, 'get'>;
  list: Pick<WebPanelList, 'find' | 'show' | 'available'>;
  form: Pick<WebPanelForm, 'add'>;
  logger: Logger;
}

export interface TileWebPanelsSources {
  /** The document of Vivaldi's browser window. */
  document: PanelDocument;
  /** The selectors of the running Vivaldi. */
  selectors: SelectorCatalog;
  prefs: BrowserPrefs;
  /** The bookmark access, to read the tile's page. */
  writer: Pick<BookmarkWriter, 'get'>;
  /** Where a reason is written when the commands are not offered. */
  logger: Logger;
}

export class TileWebPanels {
  #deps: TileWebPanelsDependencies;

  /**
   * The web panel command of a tile: Open as web panel for a page that is not a panel, Show web
   * panel for one that is. Neither touches the tile, and no other panel is changed.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TileWebPanelsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param sources What the commands are built from.
   * @returns The commands, or null when the panel bar's selectors or the preferences are missing.
   */
  public static of({ document, selectors, prefs, writer, logger }: TileWebPanelsSources): TileWebPanels | null {
    const bar = PanelBar.of(document, selectors);
    if (bar === null || !prefs.available) {
      logger.warn('The web panel selectors or the preferences are missing: the tile menu has no web panel command');
      return null;
    }
    return new TileWebPanels({ writer, list: new WebPanelList({ prefs, bar }), form: new WebPanelForm({ bar }), logger });
  }

  /**
   * @param favoriteId The id of the tile's bookmark.
   * @returns The command for the tile, or null for a page that is not `http` or `https`, or when the panel bar is not in the window.
   */
  public async item(favoriteId: string): Promise<CommandItem | null> {
    const { writer, list, form, logger } = this.#deps;
    if (!list.available) {
      return null;
    }
    const address = await writer.get(favoriteId).then((node) => node.url ?? '', () => '');
    if (!/^https?:\/\//i.test(address)) {
      return null;
    }
    const id = await list.find(address);
    if (id !== null) {
      return { label: SHOW_WEB_PANEL_LABEL, run: (): void => void list.show(id) };
    }
    return { label: OPEN_WEB_PANEL_LABEL, run: (): void => void form.add(address).catch((error: unknown) => logger.error('Could not add the web panel', error)) };
  }
}
