import type { FrameTiming } from '../../core/FrameTask.js';
import { DomQuery } from '../../core/DomQuery.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../../core/Module.js';
import { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { AddressField } from './AddressField.js';
import { BarButton } from './BarButton.js';
import { BottomBar } from './BottomBar.js';
import { CommandLauncher } from './CommandLauncher.js';
import { DownloadsButton } from './DownloadsButton.js';
import { HiddenButtons } from './HiddenButtons.js';
import { IncognitoHeader } from './IncognitoHeader.js';
import { NewTabRow } from './NewTabRow.js';
import { PrivateTabs } from './PrivateTabs.js';

const HEADER_ORDER = 10;
const NEW_TAB_ORDER = 12;
const HIDDEN_SELECTORS = ['newTabButton', 'workspaceButton'];

interface Parts {
  launcher: CommandLauncher;
  tabs: PrivateTabs;
}

export class Incognito extends Module {
  public static override id = 'incognito';
  public static override privateWindows: PrivateWindowPolicy = 'only';

  #frames: FrameTiming;
  #stops: Array<() => void> = [];

  /**
   * @param frames Frame scheduling for the parts that follow Vivaldi's redraws, replaceable in tests.
   */
  constructor(frames: FrameTiming = {}) {
    super();
    this.#frames = frames;
  }

  /**
   * Gives a private window Arc's tab bar: the title `Incognito Tabs` with `Clear`, a `New Tab` row,
   * and a bottom bar with Library at the left and `+` at the right. Vivaldi's own new tab and
   * workspace buttons are hidden. The module starts only in a private window and stores nothing.
   * Without `chrome.tabs` or the tab bar it stays off.
   *
   * @param context What the module may use.
   */
  public override start(context: ModuleContext): void {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the private tab bar is off');
      return;
    }
    try {
      this.#draw(context, { launcher: this.#launcher(context), tabs: new PrivateTabs(tabs, context.runtime) });
    } catch (error) {
      this.stop();
      logger.warn('the private tab bar is off', error);
    }
  }

  /**
   * Removes the mark, the rows, the bottom bar and every listener, and shows Vivaldi's buttons again.
   */
  public override stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }

  #launcher({ document, selectors, tabs, runtime }: ModuleContext): CommandLauncher {
    const address = new AddressField(document, selectors.get('addressField'), this.#frames);
    this.#stops.push(() => address.stop());
    return new CommandLauncher(tabs, runtime, address, new DownloadsButton(document));
  }

  #draw(context: ModuleContext, parts: Parts): void {
    const { document, selectors } = context;
    const browser = DomQuery.require(document, selectors.get('browser'));
    browser.dataset['vivarcdiPrivate'] = '';
    this.#stops.push(() => delete browser.dataset['vivarcdiPrivate']);
    this.#hideVivaldiButtons(context, browser);
    this.#drawRows(context, parts);
    this.#drawBottomBar(context, parts, browser);
  }

  #hideVivaldiButtons({ document, selectors }: ModuleContext, browser: HTMLElement): void {
    const hidden = new HiddenButtons(document, HIDDEN_SELECTORS.filter((name) => selectors.has(name)).map((name) => selectors.get(name)), browser, { timing: this.#frames });
    this.#stops.push(() => hidden.stop());
    hidden.start();
  }

  #drawRows({ document, selectors, logger }: ModuleContext, { launcher, tabs }: Parts): void {
    const anchor = TabBarAnchor.of(document, selectors.get('tabListHost'));
    const header = new IncognitoHeader(document, () => Incognito.#attempt(logger, 'clear', () => tabs.clear()));
    const row = new NewTabRow(document, () => Incognito.#attempt(logger, 'new tab', () => launcher.newTab()));
    this.#stops.push(anchor.add(header.element, HEADER_ORDER), anchor.add(row.element, NEW_TAB_ORDER));
  }

  #drawBottomBar({ document, selectors, logger }: ModuleContext, { launcher }: Parts, browser: HTMLElement): void {
    if (!selectors.has('tabsContainer')) {
      return;
    }
    const library = new BarButton(document, { name: 'library', title: 'Library: Downloads', onClick: (): void => this.#openLibrary(launcher, logger) });
    const plus = new BarButton(document, { name: 'plus', title: 'New tab', onClick: (): void => Incognito.#attempt(logger, 'new tab', () => launcher.newTab()) });
    const bar = new BottomBar(document, selectors.get('tabsContainer'), [library, plus], { root: browser, timing: this.#frames });
    this.#stops.push(() => bar.stop());
    bar.start();
  }

  #openLibrary(launcher: CommandLauncher, logger: ModuleContext['logger']): void {
    if (!launcher.openLibrary()) {
      logger.warn('the Downloads button was not found');
    }
  }

  static #attempt(logger: ModuleContext['logger'], what: string, action: () => Promise<void>): void {
    action().catch((error: unknown) => logger.warn(`${what} failed`, error));
  }
}
