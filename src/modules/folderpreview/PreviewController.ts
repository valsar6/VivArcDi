import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';
import type { Logger } from '../../core/Logger.js';
import type { LinkActivator } from '../folders/LinkActivator.js';
import type { OpenLinks } from '../folders/OpenLinks.js';
import { LastOpenedStore } from '../reopen/LastOpenedStore.js';
import type { KeyValueStorage } from '../reopen/LastOpenedStore.js';
import { FolderHover } from './FolderHover.js';
import { FolderLinks } from './FolderLinks.js';
import { PreviewPanelView } from './PreviewPanelView.js';
import { PreviewRows } from './PreviewRows.js';
import type { PreviewRow } from './PreviewRows.js';
import { PreviewSession } from './PreviewSession.js';
import { PreviewText } from './PreviewText.js';

const FOLDER_ROW = '[data-vivarcdi-folder-id]';

export interface PreviewParts {
  document: Document;
  /** Where the panel is added. */
  parent: HTMLElement;
  /** The tab bar, which the panel opens beside. */
  bar: () => HTMLElement | null;
  bookmarks: Pick<BrowserBookmarks, 'getTree'>;
  openLinks: Pick<OpenLinks, 'refresh'>;
  activator: Pick<LinkActivator, 'activate'>;
  storage: KeyValueStorage | null;
  locale: string;
  delayMs: number;
  logger: Logger;
}

export class PreviewController {
  #parts: PreviewParts;
  #view: PreviewPanelView;
  #hover: FolderHover;
  #generation = 0;
  #closeOnFolderClick = (event: Event): void => {
    if (this.#view.isOpen && (event.target as HTMLElement | null)?.closest(FOLDER_ROW) != null) {
      this.dismiss();
    }
  };

  /**
   * Joins the hover, the data and the panel: when the pointer rests on a folder it reads the folder
   * and its dates and opens the panel, and a chosen row is opened through the link activator.
   *
   * @param parts The collaborators and settings.
   */
  constructor(parts: PreviewParts) {
    this.#parts = parts;
    this.#view = new PreviewPanelView(parts.document, parts.parent, {
      onActivate: (row): void => this.#activate(row),
      onClose: (): void => this.dismiss(),
    });
    this.#hover = new FolderHover(parts.document, parts.delayMs, {
      onOpen: (folderId, row): void => void this.#show(folderId, row),
      onClose: (): void => this.#close(),
    });
  }

  /**
   * Starts listening to the pointer.
   */
  public start(): void {
    this.#hover.start();
    this.#parts.document.addEventListener('click', this.#closeOnFolderClick, true);
  }

  /**
   * Removes the panel and every listener.
   */
  public stop(): void {
    this.#hover.stop();
    this.#parts.document.removeEventListener('click', this.#closeOnFolderClick, true);
    this.#close();
  }

  /**
   * Closes the panel for a reason other than the pointer leaving.
   */
  public dismiss(): void {
    this.#close();
    this.#hover.closed();
  }

  #close(): void {
    this.#generation += 1;
    this.#view.close();
  }

  #activate(row: PreviewRow): void {
    this.dismiss();
    void this.#parts.openLinks.refresh().then(() => this.#parts.activator.activate(row.link));
  }

  async #show(folderId: string, row: HTMLElement): Promise<void> {
    const ticket = ++this.#generation;
    const { bookmarks, storage, logger, locale } = this.#parts;
    try {
      const content = FolderLinks.find(await bookmarks.getTree(), folderId);
      if (ticket !== this.#generation || content === null || content.links.length === 0) {
        return;
      }
      const dates = new LastOpenedStore(storage, logger);
      dates.load(new Date());
      const bar = this.#parts.bar() ?? row;
      this.#view.open(
        { title: content.title, session: new PreviewSession(PreviewRows.build(content.links, dates)), texts: PreviewText.of(locale), locale, now: new Date() },
        { row: row.getBoundingClientRect(), bar: bar.getBoundingClientRect() },
      );
    } catch (error) {
      logger.warn('could not read the folder for the panel', error);
    }
  }
}
