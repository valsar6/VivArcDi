import { AddressField } from '../../shared/newtab/AddressField.js';
import { DomQuery } from '../../core/dom/DomQuery.js';
import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { NewTabOpener } from '../../shared/newtab/NewTabOpener.js';
import { NewTabRow } from '../../shared/newtab/NewTabRow.js';
import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { Palettes } from './Palettes.js';
import type { Palette } from './Palettes.js';
import { ScrollMark } from './ScrollMark.js';

export const LOOK_ATTRIBUTE = 'data-vivarcdi-look';
export const PALETTE_ATTRIBUTE = 'data-vivarcdi-palette';
export const GRADIENT_ATTRIBUTE = 'data-vivarcdi-gradient';
const GRADIENT_PROPERTY = '--vivarcdi-gradient';
const NEW_TAB_ORDER = 30;

export interface SidebarLookSettings {
  /** Whether the look is applied. */
  enabled: boolean;
  /** Name of the palette that a workspace without a color of its own uses. */
  palette: string;
}

export class SidebarLook extends Module {
  public static override id = 'sidebar-look';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<SidebarLookSettings> = Object.freeze({
    enabled: true,
    palette: Palettes.defaultName,
  });

  #stops: Array<() => void> = [];

  /**
   * Gives the vertical tab bar Arc's look: marks Vivaldi's root so that `sidebar-look.css` applies,
   * sets the colors of the chosen palette, marks the tab list while it scrolls and adds a
   * `+ New Tab` row before today's tabs. Everything is removed on stop, and nothing is touched
   * while the module is disabled.
   *
   * @param context What the module may use.
   */
  public override start({ document, selectors, options, tabs, runtime, logger }: ModuleContext): void {
    const browser = DomQuery.require(document, selectors.get('browser'));
    const palette = Palettes.byName(options['palette'] ?? SidebarLook.defaults.palette);
    this.#paint(browser, palette);

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

  #paint(browser: HTMLElement, palette: Palette): void {
    const colors = { space: palette.space, pill: palette.pill, ink: palette.ink };
    browser.setAttribute(LOOK_ATTRIBUTE, '');
    browser.setAttribute(PALETTE_ATTRIBUTE, palette.name);
    for (const [name, value] of Object.entries(colors)) {
      browser.style.setProperty(`--vivarcdi-${name}`, value);
    }
    if (palette.gradient) {
      browser.setAttribute(GRADIENT_ATTRIBUTE, '');
      browser.style.setProperty(GRADIENT_PROPERTY, Palettes.css(palette.gradient));
    }
    this.#stops.push(() => {
      browser.removeAttribute(LOOK_ATTRIBUTE);
      browser.removeAttribute(PALETTE_ATTRIBUTE);
      browser.removeAttribute(GRADIENT_ATTRIBUTE);
      Object.keys(colors).forEach((name) => browser.style.removeProperty(`--vivarcdi-${name}`));
      browser.style.removeProperty(GRADIENT_PROPERTY);
    });
  }
}
