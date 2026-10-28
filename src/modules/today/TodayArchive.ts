import type { FrameTiming } from '../../core/FrameTask.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { WorkspaceTabs } from '../../core/WorkspaceTabs.js';
import { ActivityStamps } from './ActivityStamps.js';
import { ArchiveButton } from './ArchiveButton.js';
import { ArchiveKeys } from './ArchiveKeys.js';
import { ArchivePanelView } from './ArchivePanelView.js';
import { ArchiveRestorer } from './ArchiveRestorer.js';
import { ArchiveStore } from './ArchiveStore.js';
import type { ArchiveEntry } from './ArchiveStore.js';
import { ArchiveSweeper, repeatEvery } from './ArchiveSweeper.js';
import type { RepeatTimer } from './ArchiveSweeper.js';
import { ClearButton } from './ClearButton.js';

export interface TodayArchiveClock {
  /** The current time in milliseconds. */
  now: () => number;
  /** Runs the sweep at a fixed interval. */
  repeat: RepeatTimer;
  /** Frame scheduling for the buttons. */
  frames?: FrameTiming;
}

const HOUR_MS = 3_600_000;
const DEFAULT_HOURS = 12;
const MIN_HOURS = 1;
const MAX_HOURS = 720;
const DEFAULT_LIMIT = 500;
const MIN_LIMIT = 50;
const MAX_LIMIT = 5000;
const SYSTEM_CLOCK: TodayArchiveClock = { now: () => Date.now(), repeat: repeatEvery };

export class TodayArchive extends Module {
  public static override id = 'today-archive';

  #clock: TodayArchiveClock;
  #stops: Array<() => void> = [];
  #store: ArchiveStore | null = null;
  #sweeper: ArchiveSweeper | null = null;
  #panel: ArchivePanelView | null = null;

  /**
   * @param clock Time and timers, replaceable in tests.
   */
  constructor(clock: TodayArchiveClock = SYSTEM_CLOCK) {
    super();
    this.#clock = clock;
  }

  /**
   * Archives Today tabs as in Arc: a tab inactive for `archiveAfterHours` is saved to the archive
   * and closed, "Clear" on the pinned separator archives the workspace's Today tabs at once, and
   * the archive opens from a tab bar button and Cmd/Ctrl+Shift+A. Without `chrome.tabs` it stays
   * off and closes nothing.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, logger, options, storage } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the archive is off');
      return;
    }
    const limitMs = TodayArchive.#number(options['archiveAfterHours'], DEFAULT_HOURS, MIN_HOURS, MAX_HOURS) * HOUR_MS;
    const store = new ArchiveStore(storage, TodayArchive.#number(options['archiveLimit'], DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT), logger);
    store.load();
    this.#store = store;
    try {
      const stamps = new ActivityStamps(tabs, this.#clock.now, logger);
      this.#stops.push(() => stamps.stop());
      await stamps.start();
      this.#sweeper = new ArchiveSweeper({ tabs, store, stamps, limitMs, now: this.#clock.now, repeat: this.#clock.repeat, logger });
      this.#sweeper.start();
      this.#stops.push(() => this.#sweeper?.stop());
      await this.#startInterface(context, new ArchiveRestorer(new WorkspaceTabs(tabs, logger), store, logger));
    } catch (error) {
      this.stop();
      logger.warn('the archive is off', error);
    }
  }

  /**
   * Stops sweeping and removes the panel, the buttons and every listener. The archive and the
   * stamps in the tabs stay.
   */
  public override stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
    this.#sweeper = null;
    this.#panel = null;
    this.#store = null;
  }

  async #startInterface(context: ModuleContext, restorer: ArchiveRestorer): Promise<void> {
    const { document, selectors, logger } = context;
    const browser = document.querySelector<HTMLElement>(selectors.get('browser'));
    if (browser === null) {
      logger.warn('the browser element is missing: the archive panel is off');
      return;
    }
    const panel = new ArchivePanelView(
      document,
      browser,
      {
        onRestore: (entry): void => this.#restore(restorer, entry),
        onArchiveToday: (): void => void this.#clear(),
        onClose: (): void => panel.close(),
      },
      document.defaultView?.navigator.language ?? 'en',
    );
    this.#panel = panel;
    this.#stops.push(() => panel.close());
    const toggle = (): void => this.#toggle(context);
    const frames = this.#clock.frames === undefined ? {} : { timing: this.#clock.frames };
    const clear = new ClearButton(document, browser, () => void this.#clear(), frames);
    this.#startPart(clear);
    if (selectors.has('tabsContainer')) {
      this.#startPart(new ArchiveButton(document, selectors.get('tabsContainer'), toggle, { root: browser, ...frames }));
    }
    const keys = new ArchiveKeys(context, toggle);
    this.#stops.push(() => keys.stop());
    await keys.start();
  }

  #startPart(part: { start: () => void; stop: () => void }): void {
    this.#stops.push(() => part.stop());
    part.start();
  }

  #toggle({ document, selectors }: ModuleContext): void {
    const panel = this.#panel;
    if (panel === null || this.#store === null) {
      return;
    }
    if (panel.isOpen) {
      panel.close();
      return;
    }
    const bar = document.querySelector<HTMLElement>(selectors.get('tabBar')) ?? document.querySelector<HTMLElement>(selectors.get('browser'));
    if (bar !== null) {
      panel.open(this.#store.entries, bar.getBoundingClientRect());
    }
  }

  #restore(restorer: ArchiveRestorer, entry: ArchiveEntry): void {
    this.#panel?.close();
    void restorer.restore(entry);
  }

  async #clear(): Promise<void> {
    await this.#sweeper?.clear();
    if (this.#panel?.isOpen === true && this.#store !== null) {
      this.#panel.refresh(this.#store.entries);
    }
  }

  static #number(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
}
