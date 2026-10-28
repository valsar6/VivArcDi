import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import { ActivityClock } from './ActivityClock.js';
import type { ActivityStamps } from './ActivityStamps.js';
import type { ArchiveEntry, ArchiveStore } from './ArchiveStore.js';
import { TodayTabPolicy } from './TodayTabPolicy.js';

export type SweepTabs = Pick<BrowserTabs, 'query' | 'remove'>;

type IdentifiedTab = chrome.tabs.Tab & { id: number };

export type RepeatTimer = (run: () => void, intervalMs: number) => () => void;

export interface SweeperDependencies {
  tabs: SweepTabs;
  store: Pick<ArchiveStore, 'add'>;
  stamps: Pick<ActivityStamps, 'stamp'>;
  /** How long a Today tab may stay inactive, in milliseconds. */
  limitMs: number;
  /** The current time in milliseconds. */
  now: () => number;
  /** Runs a job at a fixed interval; returns a function that stops it. */
  repeat: RepeatTimer;
  logger: Logger;
}

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Runs a job with `setInterval`.
 *
 * @param run The job.
 * @param intervalMs Milliseconds between runs; the first run comes after one interval.
 * @returns A function that stops the runs.
 */
export const repeatEvery: RepeatTimer = (run, intervalMs) => {
  const handle = setInterval(run, intervalMs);
  return () => clearInterval(handle);
};

export class ArchiveSweeper {
  #deps: SweeperDependencies;
  #queue: Promise<void> = Promise.resolve();
  #cancel: (() => void) | null = null;

  /**
   * Closes Today tabs into the archive: once a minute those inactive for too long, and on request
   * every Today tab of the current workspace. A tab is saved to the archive before it is closed,
   * so a tab whose entry cannot be saved stays open.
   *
   * @param dependencies Everything the sweeper collaborates with.
   */
  constructor(dependencies: SweeperDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Sweeps a minute from now and then once a minute.
   */
  public start(): void {
    this.#cancel ??= this.#deps.repeat(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  /**
   * Stops sweeping.
   */
  public stop(): void {
    this.#cancel?.();
    this.#cancel = null;
  }

  /**
   * Archives every Today tab of this window inactive past the limit. A tab never stamped is
   * stamped instead, so that its time starts now.
   *
   * @returns Settles once the sweep is over; sweeps and clears run one at a time.
   */
  public sweep(): Promise<void> {
    return this.#enqueue(() => this.#sweepNow());
  }

  /**
   * Archives now, whatever their age, the Today tabs of the active tab's workspace. The active
   * tab is never among them.
   *
   * @returns Settles once the tabs are archived.
   */
  public clear(): Promise<void> {
    return this.#enqueue(() => this.#clearNow());
  }

  #enqueue(job: () => Promise<void>): Promise<void> {
    this.#queue = this.#queue.then(job).catch((error: unknown) => this.#deps.logger.warn('the archive sweep failed', error));
    return this.#queue;
  }

  async #sweepNow(): Promise<void> {
    const now = this.#deps.now();
    const stale: IdentifiedTab[] = [];
    for (const tab of (await this.#windowTabs()).filter((candidate) => TodayTabPolicy.isArchivable(candidate))) {
      const lastActive = ActivityClock.lastActiveOf(tab);
      if (lastActive === null) {
        await this.#deps.stamps.stamp(tab.id);
      } else if (now - lastActive >= this.#deps.limitMs) {
        stale.push(tab);
      }
    }
    await this.#archive(stale);
  }

  async #clearNow(): Promise<void> {
    const windowTabs = await this.#windowTabs();
    const active = windowTabs.find((tab) => tab.active);
    if (active === undefined) {
      return;
    }
    const workspace = TabData.of(active);
    await this.#archive(windowTabs.filter((tab) => TodayTabPolicy.isArchivable(tab) && TabData.of(tab) === workspace));
  }

  async #windowTabs(): Promise<IdentifiedTab[]> {
    const windowTabs = await this.#deps.tabs.query({ currentWindow: true });
    return windowTabs.filter((tab): tab is IdentifiedTab => tab.id !== undefined);
  }

  async #archive(tabs: IdentifiedTab[]): Promise<void> {
    if (tabs.length === 0) {
      return;
    }
    const archivedAt = this.#deps.now();
    try {
      this.#deps.store.add(tabs.map((tab) => ArchiveSweeper.#entryOf(tab, archivedAt)));
    } catch (error) {
      this.#deps.logger.warn('could not save to the archive: the tabs stay open', error);
      return;
    }
    for (const tab of tabs) {
      await this.#deps.tabs.remove(tab.id).catch((error: unknown) => this.#deps.logger.warn(`could not close tab ${tab.id}`, error));
    }
  }

  static #entryOf(tab: chrome.tabs.Tab, archivedAt: number): ArchiveEntry {
    const url = tab.url ?? '';
    return { url, title: tab.title ?? url, favIconUrl: tab.favIconUrl ?? null, workspace: TabData.of(tab), archivedAt };
  }
}
