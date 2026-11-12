import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import type { Logger } from '../../core/support/Logger.js';
import type { ExternalLinkDetector } from './ExternalLinkDetector.js';
import type { LittleArcLauncher } from './LittleArcLauncher.js';

export const DETECTION_DELAY_MS = 80;

export class ExternalLinkWatcher {
  #tabs: Pick<BrowserTabs, 'get'>;
  #detector: Pick<ExternalLinkDetector, 'accepts'>;
  #launcher: Pick<LittleArcLauncher, 'adopt'>;
  #logger: Logger;

  /**
   * Looks at a new tab a moment after it appeared, when the focus events that tell where it came
   * from have arrived, and moves it into a Little Arc window if it is a link from another app.
   *
   * @param tabs Reads the tab again.
   * @param detector Decides whether the tab is a link from another app.
   * @param launcher Moves the tab into a Little Arc window.
   * @param logger Logger for failures.
   */
  constructor(
    tabs: Pick<BrowserTabs, 'get'>,
    detector: Pick<ExternalLinkDetector, 'accepts'>,
    launcher: Pick<LittleArcLauncher, 'adopt'>,
    logger: Logger,
  ) {
    this.#tabs = tabs;
    this.#detector = detector;
    this.#launcher = launcher;
    this.#logger = logger;
  }

  /**
   * @param tabId The new tab.
   * @param createdAt When it appeared, in milliseconds.
   * @returns Whether the tab was moved into a Little Arc window.
   */
  public async check(tabId: number, createdAt: number): Promise<boolean> {
    try {
      const tab = await this.#tabs.get(tabId);
      return this.#detector.accepts(tab, createdAt) && (await this.#launcher.adopt(tabId));
    } catch (error) {
      this.#logger.warn('could not check whether the new tab is a link from another app', error);
      return false;
    }
  }
}
