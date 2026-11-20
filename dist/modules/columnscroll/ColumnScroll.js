import { Module } from "../../core/boot/Module.js";
import { ColumnMark } from "./ColumnMark.js";
import { StripOverflow } from "./StripOverflow.js";
class ColumnScroll extends Module {
  static id = "column-scroll";
  #mark = null;
  #overflow = null;
  /**
   * Makes the sidebar below the Favorites scroll as one list, as in Arc: marks the column of the
   * vertical tab bar so that `column-scroll.css` takes the scroll away from the folder section and
   * from Vivaldi's tab strip and gives it to the column. IF the selectors of the column are not in
   * the catalog, THEN the column stays as Vivaldi draws it and a warning is logged.
   *
   * @param context What the module may use.
   */
  start({ document, selectors, logger }) {
    if (!selectors.has("tabsContainer") || !selectors.has("verticalTabBar") || !selectors.has("tabStrip")) {
      logger.warn("the column selectors are missing: the single scroll is off");
      return;
    }
    this.#mark = new ColumnMark(document, { column: selectors.get("tabsContainer"), verticalBar: selectors.get("verticalTabBar") });
    this.#mark.start();
    this.#overflow = new StripOverflow(document, { column: selectors.get("tabsContainer"), strip: selectors.get("tabStrip") });
    this.#overflow.start();
  }
  /**
   * Removes the mark and stops following Vivaldi's redraws.
   */
  stop() {
    this.#overflow?.stop();
    this.#overflow = null;
    this.#mark?.stop();
    this.#mark = null;
  }
}
export {
  ColumnScroll
};
