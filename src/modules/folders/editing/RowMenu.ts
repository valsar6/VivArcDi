import type { ContextMenu } from '../../../core/dom/ContextMenu.js';
import { LinkId } from '../../../shared/links/LinkId.js';
import type { LinkMenuItems } from './LinkMenuItems.js';
import { LINK_ATTRIBUTE } from '../dragdrop/DropTargets.js';

export interface RowMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  items: Pick<LinkMenuItems, 'for'>;
}

export class RowMenu {
  #deps: RowMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a link row of the folders section, opened with a right click, with the items of
   * `LinkMenuItems`. Vivaldi's own menu is cancelled for the link rows of bookmarks only.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: RowMenuDependencies) {
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
    const id = (event.target as Element | null)?.closest?.(`[${LINK_ATTRIBUTE}]`)?.getAttribute(LINK_ATTRIBUTE) ?? null;
    if (id === null || LinkId.isVirtual(id)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { menu, items } = this.#deps;
    const { clientX, clientY } = event;
    void items.for(id).then((list) => menu.open(list, clientX, clientY));
  }
}
