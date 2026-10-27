const TILES_ATTRIBUTE = "data-vivarcdi-tiles";
const TILE_ATTRIBUTE = "data-vivarcdi-tile";
const CURRENT_ATTRIBUTE = "data-vivarcdi-current";
const DIMMED_ATTRIBUTE = "data-vivarcdi-unloaded";
const AWAY_ATTRIBUTE = "data-vivarcdi-away";
const MIDDLE_BUTTON = 1;
const PRIMARY_BUTTON = 0;
class FavoritesView {
  #document;
  #actions;
  #root;
  #favorites = /* @__PURE__ */ new Map();
  #tiles = /* @__PURE__ */ new Map();
  #signature = "";
  #onClick = (event) => this.#handle(event);
  #onMouseDown = (event) => {
    if (event.button === MIDDLE_BUTTON) {
      event.preventDefault();
    }
  };
  /**
   * The Favorites grid drawn from bookmarks: one icon tile per Favorite, the same in every
   * workspace. The tile of the current tab has a glowing border and the tile of an unloaded
   * tab is dimmed.
   *
   * @param document The document of Vivaldi's browser window.
   * @param actions What clicks on tiles do.
   */
  constructor(document, actions) {
    this.#document = document;
    this.#actions = actions;
    this.#root = document.createElement("div");
    this.#root.setAttribute(TILES_ATTRIBUTE, "");
    this.#root.addEventListener("click", this.#onClick);
    this.#root.addEventListener("auxclick", this.#onClick);
    this.#root.addEventListener("mousedown", this.#onMouseDown);
  }
  /**
   * @returns The grid element, to place in the tab bar.
   */
  get element() {
    return this.#root;
  }
  /**
   * @returns How many tiles the grid shows.
   */
  get count() {
    return this.#tiles.size;
  }
  /**
   * Shows the Favorites in order. Tiles are rebuilt only when the Favorites changed.
   *
   * @param favorites The Favorites.
   */
  show(favorites) {
    const signature = JSON.stringify(favorites);
    if (signature === this.#signature) {
      return;
    }
    this.#signature = signature;
    this.#favorites = new Map(favorites.map((favorite) => [favorite.id, favorite]));
    this.#tiles = new Map(favorites.map((favorite) => [favorite.id, this.#tileOf(favorite)]));
    this.#root.replaceChildren(...this.#tiles.values());
  }
  /**
   * Shows the state of each tile.
   *
   * @param states The state of each tile, by bookmark id.
   */
  apply(states) {
    this.#tiles.forEach((tile, id) => {
      const state = states.get(id);
      tile.toggleAttribute(CURRENT_ATTRIBUTE, state?.active === true);
      tile.toggleAttribute(DIMMED_ATTRIBUTE, state?.unloaded ?? true);
      tile.toggleAttribute(AWAY_ATTRIBUTE, state?.away === true);
    });
  }
  /**
   * Removes the grid and its listeners.
   */
  destroy() {
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("auxclick", this.#onClick);
    this.#root.removeEventListener("mousedown", this.#onMouseDown);
    this.#root.remove();
  }
  /**
   * @param url Address of a Favorite.
   * @returns The address of its icon in Vivaldi's favicon service.
   */
  static iconOf(url) {
    return `chrome://favicon/size/16@2x/${url}`;
  }
  #tileOf(favorite) {
    const tile = this.#document.createElement("div");
    tile.setAttribute(TILE_ATTRIBUTE, favorite.id);
    tile.setAttribute(DIMMED_ATTRIBUTE, "");
    tile.title = favorite.title;
    const letter = this.#document.createElement("span");
    letter.textContent = (favorite.title.trim()[0] ?? "?").toUpperCase();
    const icon = this.#document.createElement("img");
    icon.alt = "";
    icon.addEventListener("error", () => icon.remove(), { once: true });
    icon.src = FavoritesView.iconOf(favorite.url);
    tile.append(letter, icon);
    return tile;
  }
  #handle(event) {
    const favorite = this.#favoriteAt(event.target);
    if (favorite === void 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "click" && event.button === PRIMARY_BUTTON) {
      this.#actions.open(favorite);
    } else if (event.type === "auxclick" && event.button === MIDDLE_BUTTON) {
      this.#actions.unload(favorite);
    }
  }
  #favoriteAt(target) {
    const id = target?.closest(`[${TILE_ATTRIBUTE}]`)?.getAttribute(TILE_ATTRIBUTE);
    return id === null || id === void 0 ? void 0 : this.#favorites.get(id);
  }
}
export {
  AWAY_ATTRIBUTE,
  CURRENT_ATTRIBUTE,
  DIMMED_ATTRIBUTE,
  FavoritesView,
  TILES_ATTRIBUTE,
  TILE_ATTRIBUTE
};
