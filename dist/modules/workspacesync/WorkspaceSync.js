import { Module } from "../../core/Module.js";
import { SerialTask } from "../../core/SerialTask.js";
import { Toast } from "../../core/Toast.js";
import { WorkspaceNames } from "../../core/WorkspaceNames.js";
import { WorkspaceTabs } from "../../core/WorkspaceTabs.js";
import { Debounce } from "./Debounce.js";
import { LocalPinned } from "./LocalPinned.js";
import { MissingSpaces } from "./MissingSpaces.js";
import { PinnedApplier } from "./PinnedApplier.js";
import { SyncBase } from "./SyncBase.js";
import { SyncPass } from "./SyncPass.js";
import { SyncStore } from "./SyncStore.js";
import { WindowOwner } from "./WindowOwner.js";
const SYNC_DELAY_MS = 500;
const TOAST_MS = 8e3;
class WorkspaceSync extends Module {
  static id = "workspace-sync";
  /**
   * Options accepted in `config.json`, with their defaults.
   */
  static defaults = Object.freeze({
    folder: "VivArcDi Sync"
  });
  #unsubscribe = [];
  #trigger = null;
  #names = null;
  #toast = null;
  /**
   * Keeps the pinned tabs of each workspace the same on every computer of the same Vivaldi
   * account. They are mirrored in a bookmark folder, which Vivaldi Sync carries, and merged with
   * the tabs after every change. Only one window of the browser does the merging. Without
   * `chrome.tabs`, `chrome.windows`, bookmarks or preferences the module stays off.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, windows, bookmarks, bookmarkWriter, prefs, logger } = context;
    if (!tabs.available || !windows.available || !bookmarks.available || !bookmarkWriter.available || !prefs.available) {
      logger.warn("tabs, windows, bookmarks or preferences are missing: pinned tabs are not synced");
      return;
    }
    const names = new WorkspaceNames(prefs, () => this.#trigger?.request(), logger);
    this.#names = names;
    await names.start();
    const pass = this.#pass(context, names);
    const task = new SerialTask(() => pass.run(), (error) => logger.error("workspace sync failed", error));
    const trigger = new Debounce(() => task.request(), SYNC_DELAY_MS);
    this.#trigger = trigger;
    this.#subscribe(context, trigger);
    trigger.request();
  }
  /**
   * Removes every listener and the message.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#trigger?.cancel();
    this.#names?.stop();
    this.#toast?.remove();
    this.#trigger = null;
    this.#names = null;
    this.#toast = null;
  }
  #pass(context, names) {
    const { tabs, windows, bookmarks, bookmarkWriter, storage, logger, document, selectors } = context;
    const folder = WorkspaceSync.#folderOf(context.options);
    const local = new LocalPinned(tabs, names, logger);
    this.#toast = new Toast({ document, parent: document.querySelector(selectors.get("browser")) ?? document.body, durationMs: TOAST_MS });
    const toast = this.#toast;
    return new SyncPass({
      owner: new WindowOwner(windows),
      names,
      store: new SyncStore(bookmarks, bookmarkWriter, folder),
      base: new SyncBase(storage),
      local,
      applier: new PinnedApplier(tabs, new WorkspaceTabs(tabs, logger), local, names),
      missing: new MissingSpaces(storage, (text) => toast.show(text)),
      logger
    });
  }
  #subscribe({ tabs, bookmarks, logger }, trigger) {
    const request = () => trigger.request();
    try {
      this.#unsubscribe = [
        tabs.onCreated((tab) => tab.pinned && request()),
        tabs.onUpdated((_id, change, tab) => (change.pinned !== void 0 || tab.pinned && "vivExtData" in change) && request()),
        tabs.onRemoved(request),
        tabs.onMoved(request),
        bookmarks.onChange(request)
      ];
    } catch (error) {
      this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
      this.#unsubscribe = [];
      logger.warn("cannot follow tabs or bookmarks: pinned tabs are synced only when the workspaces change", error);
    }
  }
  static #folderOf(options) {
    const { folder } = options;
    return typeof folder === "string" && folder.trim() !== "" ? folder.trim() : WorkspaceSync.defaults.folder;
  }
}
export {
  SYNC_DELAY_MS,
  WorkspaceSync
};
