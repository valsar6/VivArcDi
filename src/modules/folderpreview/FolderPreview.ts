import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { LinkActivator } from '../../shared/links/LinkActivator.js';
import { OpenLinks } from '../../shared/links/OpenLinks.js';
import { FOLDER_PREVIEW_OPTIONS } from './FolderPreviewOptions.js';
import type { FolderPreviewOptions } from './FolderPreviewOptions.js';
import { PreviewController } from './PreviewController.js';

export class FolderPreview extends Module<FolderPreviewOptions> {
  public static override id = 'folder-preview';
  public static override options = FOLDER_PREVIEW_OPTIONS;

  #controller: PreviewController | null = null;

  /**
   * Opens a panel with a search field and the links of a folder, each with the time since it was
   * last opened, when the pointer rests on a closed folder of the `bookmark-folders` section.
   * Without `chrome.bookmarks`, `chrome.tabs` or the browser element it stays off.
   *
   * @param context What the module may use.
   */
  public override start(context: ModuleContext<FolderPreviewOptions>): void {
    const { document, tabs, bookmarks, logger, options, selectors } = context;
    const parent = bookmarks.available && tabs.available ? document.querySelector<HTMLElement>(selectors.get('browser')) : null;
    if (parent === null) {
      logger.warn('chrome.bookmarks, chrome.tabs or the browser element is missing: the folder panel is off');
      return;
    }
    const openLinks = new OpenLinks(tabs, (): void => undefined, logger, {
      shownWorkspace: (): string | null => context.activeWorkspace.current,
    });
    this.#controller = new PreviewController({
      document,
      parent,
      bar: (): HTMLElement | null => document.querySelector<HTMLElement>(selectors.get('tabBar')),
      bookmarks,
      openLinks,
      activator: new LinkActivator(tabs, openLinks, logger),
      storage: context.storage,
      locale: document.defaultView?.navigator.language ?? 'en',
      delayMs: options.hoverDelayMs,
      logger,
    });
    this.#controller.start();
  }

  /**
   * Removes the panel and every listener.
   */
  public override stop(): void {
    this.#controller?.stop();
    this.#controller = null;
  }

}
