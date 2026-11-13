import { SerialTask } from "../../core/support/SerialTask.js";
import { GithubFailure, UNREACHABLE_REASON } from "./GithubPullRequests.js";
import { ArchivedPullRequests } from "./ArchivedPullRequests.js";
const defaultTicker = {
  every: (run, intervalMs) => {
    const handle = setInterval(run, intervalMs);
    return () => clearInterval(handle);
  }
};
class LiveFolderRefresher {
  #deps;
  #task;
  #pending = /* @__PURE__ */ new Set();
  #refreshAll = false;
  #stopTicker = null;
  /**
   * Decides when the live folders refresh: at the start, every interval, and when the module asks
   * for one folder because the user opened it or changed its filters. Refreshes run one at a time,
   * so a timer and a click never race. Without a connection a folder is emptied and no request is
   * sent. A failed refresh keeps the rows and sets the warning to the reason, which is logged
   * without any header; when GitHub refused the token the folder is marked to offer
   * `Reconnect GitHub`. Pull requests the user archived stay hidden until GitHub says they changed.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#task = new SerialTask(
      () => this.#run(),
      (error) => this.#deps.logger.warn("could not refresh the live folders", LiveFolderRefresher.#reasonOf(error))
    );
  }
  /**
   * Refreshes every folder now and then every interval.
   */
  start() {
    this.refreshAll();
    this.#stopTicker = this.#deps.ticker.every(() => this.refreshAll(), this.#deps.intervalMs);
  }
  /**
   * Stops the timer. A refresh that is running ends on its own.
   */
  stop() {
    this.#stopTicker?.();
    this.#stopTicker = null;
    this.#pending.clear();
    this.#refreshAll = false;
  }
  /**
   * Refreshes every live folder of every workspace.
   */
  refreshAll() {
    this.#refreshAll = true;
    this.#task.request();
  }
  /**
   * Refreshes one live folder.
   *
   * @param folderId The id of the folder in the store.
   */
  refresh(folderId) {
    this.#pending.add(folderId);
    this.#task.request();
  }
  /**
   * @returns A promise settled when every requested refresh is over.
   */
  idle() {
    return this.#task.idle();
  }
  async #run() {
    const { store } = this.#deps;
    const ids = this.#refreshAll ? store.all().map((folder) => folder.id) : [...this.#pending];
    this.#refreshAll = false;
    this.#pending.clear();
    for (const id of new Set(ids)) {
      await this.#refreshOne(id);
    }
  }
  async #refreshOne(id) {
    const { store, connection, changed } = this.#deps;
    const folder = store.find(id);
    if (folder === void 0) {
      return;
    }
    const secret = connection.token;
    if (secret === null) {
      store.update(id, { rows: [], warning: null, needsReconnect: false, archived: {} });
    } else {
      await this.#load(folder, secret);
    }
    changed();
  }
  async #load({ id, filters }, secret) {
    const { store, github, logger, now = Date.now } = this.#deps;
    try {
      const found = await github.list(filters, secret);
      const { rows, archived } = ArchivedPullRequests.apply(found, store.find(id)?.archived ?? {});
      store.update(id, { rows, archived, warning: null, needsReconnect: false, refreshedAt: now() });
    } catch (error) {
      const reason = LiveFolderRefresher.#reasonOf(error);
      store.update(id, { warning: reason, needsReconnect: error instanceof GithubFailure && error.refused });
      logger.warn("could not refresh a live folder", reason);
    }
  }
  static #reasonOf(error) {
    return error instanceof GithubFailure ? error.message : UNREACHABLE_REASON;
  }
}
export {
  LiveFolderRefresher,
  defaultTicker
};
