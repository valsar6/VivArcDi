import { systemTimers } from "../../core/support/Timers.js";
import { LabelIcon } from "../../shared/icons/LabelIcon.js";
import { notifyRowsDrawn } from "../../shared/links/InPlaceEditor.js";
import { TileHoverName } from "./TileHoverName.js";
const TILES_ATTRIBUTE = "data-vivarcdi-tiles";
const TILE_ATTRIBUTE = "data-vivarcdi-tile";
const CURRENT_ATTRIBUTE = "data-vivarcdi-current";
const DIMMED_ATTRIBUTE = "data-vivarcdi-unloaded";
const LABEL_KEY_ATTRIBUTE = "data-vivarcdi-label-key";
const TILE_LABEL_ATTRIBUTE = "data-vivarcdi-tile-label";
const ICON_CLASS = "vivarcdi-tile-icon";
const MIDDLE_BUTTON = 1;
const PRIMARY_BUTTON = 0;
class FavoritesView {
  #document;
  #actions;
  #root;
  #favorites = /* @__PURE__ */ new Map();
  #tiles = /* @__PURE__ */ new Map();
  #signature = "";
  #stopHover;
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
   * @param parent The element the hover name is added to; the body when not given.
   */
  constructor(document, actions, parent = () => document.body) {
    this.#document = document;
    this.#actions = actions;
    this.#root = document.createElement("div");
    this.#root.setAttribute(TILES_ATTRIBUTE, "");
    this.#root.addEventListener("click", this.#onClick);
    this.#root.addEventListener("auxclick", this.#onClick);
    this.#root.addEventListener("mousedown", this.#onMouseDown);
    const hover = new TileHoverName({
      document,
      parent,
      timers: systemTimers
    });
    this.#stopHover = hover.attach(this.#root, (tile) => tile.getAttribute(TILE_LABEL_ATTRIBUTE) ?? "");
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
    notifyRowsDrawn(this.#document);
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
    });
  }
  /**
   * Removes the grid and its listeners.
   */
  destroy() {
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("auxclick", this.#onClick);
    this.#root.removeEventListener("mousedown", this.#onMouseDown);
    this.#stopHover();
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
    tile.setAttribute(TILE_LABEL_ATTRIBUTE, favorite.title);
    if (favorite.labelKey !== void 0) {
      tile.setAttribute(LABEL_KEY_ATTRIBUTE, favorite.labelKey);
    }
    tile.append(...this.#iconOf(favorite));
    return tile;
  }
  #iconOf(favorite) {
    const chosen = favorite.icon === void 0 ? null : LabelIcon.create(this.#document, favorite.icon, ICON_CLASS);
    if (chosen !== null) {
      return [chosen];
    }
    const letter = this.#document.createElement("span");
    letter.textContent = (favorite.title.trim()[0] ?? "?").toUpperCase();
    const icon = this.#document.createElement("img");
    icon.alt = "";
    icon.addEventListener("error", () => icon.remove(), { once: true });
    icon.src = favorite.favicon ?? FavoritesView.iconOf(favorite.url);
    return [letter, icon];
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
  CURRENT_ATTRIBUTE,
  DIMMED_ATTRIBUTE,
  FavoritesView,
  LABEL_KEY_ATTRIBUTE,
  TILES_ATTRIBUTE,
  TILE_ATTRIBUTE,
  TILE_LABEL_ATTRIBUTE
};
