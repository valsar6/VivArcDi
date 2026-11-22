import { PIN_TAB_LABEL, UNTILE_TAB_LABEL } from '../../shared/tabs/CommandLabels.js';
import type { ContextMenu, MenuItem } from '../../core/dom/ContextMenu.js';
import type { FavoriteRemoval } from './FavoriteRemoval.js';
import type { TileLinkCommands } from './TileLinkCommands.js';
import type { TileWebPanels } from './TileWebPanels.js';
import { TILE_ATTRIBUTE } from './FavoritesView.js';

const SEPARATOR: MenuItem = { separator: true };

export interface TileMenuDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** The grid of the Favorites, when it is in the window; only its tiles have a menu. */
  grid: () => HTMLElement | null;
  menu: Pick<ContextMenu, 'open' | 'close'>;
  removal: Pick<FavoriteRemoval, 'untile' | 'pin'>;
  /** The web panel command; without it the menu has none. */
  panels?: Pick<TileWebPanels, 'item'> | undefined;
  /** The link commands of 056 for a tile; without them the menu has none. */
  links?: Pick<TileLinkCommands, 'items'> | undefined;
}

export class TileMenu {
  #deps: TileMenuDependencies;
  #onContext = (event: Event): void => this.#context(event as MouseEvent);

  /**
   * The menu of a tile of the Favorites grid, opened with a right click: Untile tab puts the page
   * back among today's tabs, Pin tab makes it a link of the workspace favorites, and a web panel
   * command follows when the page can be one. The link commands, when there are any, come first,
   * followed by a separator. Vivaldi's own menu is cancelled for tiles only.
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
    void this.#open(id, event);
  }

  #commands(id: string): MenuItem[] {
    const { removal } = this.#deps;
    return [
      { label: UNTILE_TAB_LABEL, run: (): void => void removal.untile(id) },
      { label: PIN_TAB_LABEL, run: (): void => void removal.pin(id) },
    ];
  }

  async #open(id: string, { clientX, clientY }: MouseEvent): Promise<void> {
    const { panels, links, menu } = this.#deps;
    if (panels === undefined && links === undefined) {
      menu.open(this.#commands(id), clientX, clientY);
      return;
    }
    const linked = links === undefined ? [] : await links.items(id).catch((): MenuItem[] => []);
    const panel = panels === undefined ? null : await panels.item(id).catch(() => null);
    const items = linked.length === 0 ? [] : [...linked, SEPARATOR];
    menu.open([...items, ...this.#commands(id), ...(panel === null ? [] : [panel])], clientX, clientY);
  }
}
