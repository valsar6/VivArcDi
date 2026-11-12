import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from '../../shared/tabs/CommandLabels.js';
import type { ContextMenu, MenuItem } from '../../core/ContextMenu.js';
import type { FavoriteRemoval } from './FavoriteRemoval.js';
import { TILE_ATTRIBUTE } from './FavoritesView.js';

export interface TileMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The grid of the Favorites, when it is in the window; only its tiles have a menu. */
  grid: () => HTMLElement | null;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  removal: Pick<FavoriteRemoval, 'untile' | 'pin'>;
}

export class TileMenu {
  #deps: TileMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, and Pin tab makes it a link of the workspace favorites. Vivaldi's own
   * menu is cancelled for tiles only.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TileMenuDependencies) {
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
    const tile = (event.target as Element | null)?.closest?.(`[${TILE_ATTRIBUTE}]`);
    const id = tile?.getAttribute(TILE_ATTRIBUTE) ?? null;
    if (id === null || tile?.parentElement !== this.#deps.grid()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { menu, removal } = this.#deps;
    const items: MenuItem[] = [
      { label: UNTILE_TAB_LABEL, run: (): void => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: (): void => void removal.pin(id) },
    ];
    menu.open(items, event.clientX, event.clientY);
  }
}
