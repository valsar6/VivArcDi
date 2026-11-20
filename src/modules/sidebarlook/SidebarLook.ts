import type { BrowserPrefs } from '../../core/browser/BrowserPrefs.js';
import { AddressField } from '../../shared/newtab/AddressField.js';
import { DomQuery } from '../../core/dom/DomQuery.js';
import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { NewTabOpener } from '../../shared/newtab/NewTabOpener.js';
import { NewTabRow } from '../../shared/newtab/NewTabRow.js';
import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { LookMarks } from './LookMarks.js';
import { Palettes } from './Palettes.js';
import { ScrollMark } from './ScrollMark.js';
import { SIDEBAR_LOOK_OPTIONS } from './SidebarLookOptions.js';
import type { SidebarLookOptions } from './SidebarLookOptions.js';
import { ThemePalettes } from './ThemePalettes.js';

const THEME_KEY = 'vivaldi.themes.current';
const NEW_TAB_ORDER = 30;

export class SidebarLook extends Module<SidebarLookOptions> {
  public static override id = 'sidebar-look';

  public static override options = SIDEBAR_LOOK_OPTIONS;

  #stops: Array<() => void> = [];

  /**
   * Gives the vertical tab bar Arc's look: marks Vivaldi's root so that `sidebar-look.css` applies,
   * sets the colors of the palette of the selected VivArcDi theme (else the `palette` option) and
   * follows a change of theme, marks the tab list while it scrolls and adds a `+ New Tab` row before
   * today's tabs. Everything is removed on stop, and nothing is touched while the module is disabled.
   *
   * @param context What the module may use.
   */
  public override async start({ document, selectors, options, prefs, tabs, runtime, logger }: ModuleContext<SidebarLookOptions>): Promise<void> {
    const marks = new LookMarks(DomQuery.require(document, selectors.get('browser')));
    this.#stops.push(() => marks.remove());
    const paint = async (): Promise<void> => marks.apply(Palettes.byName(await this.#paletteName(prefs, options.palette)));
    await paint();
    this.#follow(prefs, () => void paint().catch((error: unknown) => logger.warn('the palette could not follow the theme', error)));

    const scroll = new ScrollMark(document, selectors.get('tabBar'));
    scroll.start();
    this.#stops.push(() => scroll.stop());

    if (tabs.available && selectors.has('tabListHost') && selectors.has('addressField')) {
      const opener = new NewTabOpener(tabs, runtime, new AddressField(document, selectors.get('addressField')));
      const row = new NewTabRow(document, (): void => void opener.open().catch((error: unknown) => logger.warn('new tab failed', error)));
      try {
        this.#stops.push(TabBarAnchor.of(document, selectors.get('tabListHost')).add(row.element, NEW_TAB_ORDER));
      } catch (error) {
        logger.warn('the New Tab row is off', error);
      }
    }
  }

  /**
   * Removes the marks, the colors, the row and every listener.
   */
  public override stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }

  async #paletteName(prefs: BrowserPrefs, fallback: string): Promise<string> {
    if (!prefs.available) {
      return fallback;
    }
    return ThemePalettes.paletteFor(await prefs.get(THEME_KEY)) ?? fallback;
  }

  #follow(prefs: BrowserPrefs, repaint: () => void): void {
    if (prefs.available && prefs.canFollow) {
      this.#stops.push(prefs.onChange(THEME_KEY, repaint));
    }
  }
}
