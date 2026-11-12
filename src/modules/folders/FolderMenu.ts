import type { ContextMenu } from '../../core/ContextMenu.js';
import { LIVE_FOLDER_ATTRIBUTE } from './FolderRowElement.js';
import type { FolderMenuItems } from './FolderMenuItems.js';

const FOLDER_ATTRIBUTE = 'data-vivarcdi-folder-id';

export interface FolderMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  items: Pick<FolderMenuItems, 'for'>;
}

export class FolderMenu {
  #deps: FolderMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a folder row of the folders section, opened with a right click in place of
   * Vivaldi's own. The rows of a live folder keep the menu of their module.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FolderMenuDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening to `contextmenu`, in the capture phase.
   */
  public attach(): void {
    this.#deps.document.addEventListener('contextmenu', this.#onContext, true);
  }

  /**
   * Stops listening and closes the menu.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('contextmenu', this.#onContext, true);
    this.#deps.menu.close();
  }

  #context(event: MouseEvent): void {
    const folderId = FolderMenu.#folderIdOf(event.target as Element | null);
    if (folderId === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#deps.menu.open(this.#deps.items.for(folderId), event.clientX, event.clientY);
  }

  static #folderIdOf(target: Element | null): string | null {
    const row = target?.closest?.(`[${FOLDER_ATTRIBUTE}]`) ?? null;
    return row === null || row.hasAttribute(LIVE_FOLDER_ATTRIBUTE) ? null : row.getAttribute(FOLDER_ATTRIBUTE);
  }
}
