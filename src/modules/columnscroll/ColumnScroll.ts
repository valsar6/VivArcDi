import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { ColumnMark } from './ColumnMark.js';

export class ColumnScroll extends Module {
  public static override id = 'column-scroll';

  #mark: ColumnMark | null = null;

  /**
   * Makes the sidebar below the Favorites scroll as one list, as in Arc: marks the column of the
   * vertical tab bar so that `column-scroll.css` takes the scroll away from the folder section and
   * from Vivaldi's tab strip and gives it to the column. IF the selectors of the column are not in
   * the catalog, THEN the column stays as Vivaldi draws it and a warning is logged.
   *
   * @param context What the module may use.
   */
  public override start({ document, selectors, logger }: ModuleContext): void {
    if (!selectors.has('tabsContainer') || !selectors.has('verticalTabBar')) {
      logger.warn('the column selectors are missing: the single scroll is off');
      return;
    }
    this.#mark = new ColumnMark(document, { column: selectors.get('tabsContainer'), verticalBar: selectors.get('verticalTabBar') });
    this.#mark.start();
  }

  /**
   * Removes the mark and stops following Vivaldi's redraws.
   */
  public override stop(): void {
    this.#mark?.stop();
    this.#mark = null;
  }
}
