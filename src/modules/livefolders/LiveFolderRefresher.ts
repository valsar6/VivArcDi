import type { Logger } from '../../core/Logger.js';
import { SerialTask } from '../../core/SerialTask.js';
import { GithubFailure, UNREACHABLE_REASON } from './GithubPullRequests.js';
import type { GithubPullRequests } from './GithubPullRequests.js';
import type { GithubToken } from './GithubToken.js';
import type { LiveFolderStore } from './LiveFolderStore.js';

/** Calls a function again and again until it is stopped; replaceable in tests. */
export interface Ticker {
  every: (run: () => void, intervalMs: number) => () => void;
}

export interface RefresherDependencies {
  store: LiveFolderStore;
  github: Pick<GithubPullRequests, 'list'>;
  token: Pick<GithubToken, 'read'>;
  /** Called after a folder changed, so that its rows are drawn again. */
  changed: () => void;
  ticker: Ticker;
  intervalMs: number;
  logger: Logger;
  now?: () => number;
}

export const defaultTicker: Ticker = {
  every: (run, intervalMs) => {
    const handle = setInterval(run, intervalMs);
    return () => clearInterval(handle);
  },
};

export class LiveFolderRefresher {
  #deps: RefresherDependencies;
  #task: SerialTask;
  #pending = new Set<string>();
  #refreshAll = false;
  #stopTicker: (() => void) | null = null;

  /**
   * Decides when the live folders refresh: at the start, every interval, and when the module asks
   * for one folder because the user opened it or changed its filters. Refreshes run one at a time,
   * so a timer and a click never race. Without a token a folder gets the `Connect GitHub` row and
   * no request is sent. A failed refresh keeps the rows and sets the warning to the reason, which
   * is logged without any header.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: RefresherDependencies) {
    this.#deps = dependencies;
    this.#task = new SerialTask(
      () => this.#run(),
      (error) => this.#deps.logger.warn('could not refresh the live folders', LiveFolderRefresher.#reasonOf(error)),
    );
  }

  /**
   * Refreshes every folder now and then every interval.
   */
  public start(): void {
    this.refreshAll();
    this.#stopTicker = this.#deps.ticker.every(() => this.refreshAll(), this.#deps.intervalMs);
  }

  /**
   * Stops the timer. A refresh that is running ends on its own.
   */
  public stop(): void {
    this.#stopTicker?.();
    this.#stopTicker = null;
    this.#pending.clear();
    this.#refreshAll = false;
  }

  /**
   * Refreshes every live folder of every workspace.
   */
  public refreshAll(): void {
    this.#refreshAll = true;
    this.#task.request();
  }

  /**
   * Refreshes one live folder.
   *
   * @param folderId The id of the folder in the store.
   */
  public refresh(folderId: string): void {
    this.#pending.add(folderId);
    this.#task.request();
  }

  /**
   * @returns A promise settled when every requested refresh is over.
   */
  public idle(): Promise<void> {
    return this.#task.idle();
  }

  async #run(): Promise<void> {
    const { store } = this.#deps;
    const ids = this.#refreshAll ? store.all().map((folder) => folder.id) : [...this.#pending];
    this.#refreshAll = false;
    this.#pending.clear();
    for (const id of new Set(ids)) {
      await this.#refreshOne(id);
    }
  }

  async #refreshOne(id: string): Promise<void> {
    const { store, github, token, changed, logger, now = Date.now } = this.#deps;
    const folder = store.find(id);
    if (folder === undefined) {
      return;
    }
    const secret = await token.read();
    if (secret === null) {
      store.update(id, { rows: [], warning: null, needsToken: true });
    } else {
      try {
        const rows = await github.list(folder.filters, secret);
        store.update(id, { rows, warning: null, needsToken: false, refreshedAt: now() });
      } catch (error) {
        const reason = LiveFolderRefresher.#reasonOf(error);
        store.update(id, { warning: reason });
        logger.warn('could not refresh a live folder', reason);
      }
    }
    changed();
  }

  static #reasonOf(error: unknown): string {
    return error instanceof GithubFailure ? error.message : UNREACHABLE_REASON;
  }
}
