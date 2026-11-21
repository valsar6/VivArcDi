import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from '../../shared/tabs/CommandLabels.js';
import type { ContextMenu, MenuItem } from '../../core/dom/ContextMenu.js';
import type { FavoriteRemoval } from './FavoriteRemoval.js';
import type { TileWebPanels } from './TileWebPanels.js';
import { TILE_ATTRIBUTE } from './FavoritesView.js';

export interface TileMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The grid of the Favorites, when it is in the window; only its tiles have a menu. */
  grid: () => HTMLElement | null;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  removal: Pick<FavoriteRemoval, 'untile' | 'pin'>;
  /** The web panel command; without it the menu has none. */
  panels?: Pick<TileWebPanels, 'item'> | undefined;
}

export class TileMenu {
  #deps: TileMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, Pin tab makes it a link of the workspace favorites, and a web panel
   * command follows when the page can be one. Vivaldi's own
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
    this.#open(this.#commands(id), id, event);
  }

  #commands(id: string): MenuItem[] {
    const { removal } = this.#deps;
    return [
      { label: UNTILE_TAB_LABEL, run: (): void => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: (): void => void removal.pin(id) },
    ];
  }

  #open(items: MenuItem[], id: string, { clientX, clientY }: MouseEvent): void {
    const { panels, menu } = this.#deps;
    if (panels === undefined) {
      menu.open(items, clientX, clientY);
      return;
    }
    void panels
      .item(id)
      .catch(() => null)
      .then((panel) => menu.open(panel === null ? items : [...items, panel], clientX, clientY));
  }
}
