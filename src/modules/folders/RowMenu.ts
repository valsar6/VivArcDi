import { REMOVE_PIN_LABEL, TILE_TAB_LABEL } from '../../core/CommandLabels.js';
import type { ContextMenu, MenuItem } from '../../core/ContextMenu.js';
import type { LinkRemoval } from './LinkRemoval.js';
import { LINK_ATTRIBUTE } from './DropTargets.js';

export interface RowMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  removal: Pick<LinkRemoval, 'removePin' | 'tile'>;
}

export class RowMenu {
  #deps: RowMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a link row of the folders section, opened with a right click: Remove pin puts the
   * page back among today's tabs, and Tile tab makes it a tile of the Favorites grid. Vivaldi's own
   * menu is cancelled for link rows only.
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
    if (id === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { menu, removal } = this.#deps;
    const items: MenuItem[] = [
      { label: REMOVE_PIN_LABEL, run: (): void => void removal.removePin(id) },
      { label: TILE_TAB_LABEL, run: (): void => void removal.tile(id) },
    ];
    menu.open(items, event.clientX, event.clientY);
  }
}
