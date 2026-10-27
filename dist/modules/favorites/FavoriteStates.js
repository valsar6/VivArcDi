import { OwnPage } from "../../core/OwnPage.js";
import { UnloadedTabs } from "./UnloadedTabs.js";
class FavoriteStates {
  /**
   * Turns the links of the window into what each tile shows.
   *
   * @param favorites The Favorites, in order.
   * @param snapshot The linked tabs of the current workspace.
   * @returns The state of each tile, by bookmark id.
   */
  static of(favorites, snapshot) {
    return new Map(
      favorites.map(({ id }) => {
        const tab = snapshot.linked.get(id);
        return [
          id,
          {
            active: tab?.active === true,
            unloaded: tab === void 0 || UnloadedTabs.isUnloaded(tab),
            away: tab !== void 0 && OwnPage.isAway(tab)
          }
        ];
      })
    );
  }
}
export {
  FavoriteStates
};
