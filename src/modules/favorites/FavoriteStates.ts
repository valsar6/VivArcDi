import { OwnPage } from '../../core/OwnPage.js';
import type { Favorite } from './FavoritesFolder.js';
import type { LinkSnapshot } from './LinkedTabs.js';
import { UnloadedTabs } from './UnloadedTabs.js';

export interface TileState {
  /** The user is on this Favorite's tab. */
  active: boolean;
  /** The Favorite's tab is unloaded, or not opened yet in this workspace. */
  unloaded: boolean;
  /** The Favorite's tab shows another page than its own. */
  away: boolean;
}

export class FavoriteStates {
  /**
   * Turns the links of the window into what each tile shows.
   *
   * @param favorites The Favorites, in order.
   * @param snapshot The linked tabs of the current workspace.
   * @returns The state of each tile, by bookmark id.
   */
  public static of(favorites: Favorite[], snapshot: LinkSnapshot): Map<string, TileState> {
    return new Map(
      favorites.map(({ id }) => {
        const tab = snapshot.linked.get(id);
        return [
          id,
          {
            active: tab?.active === true,
            unloaded: tab === undefined || UnloadedTabs.isUnloaded(tab),
            away: tab !== undefined && OwnPage.isAway(tab),
          },
        ];
      }),
    );
  }
}
