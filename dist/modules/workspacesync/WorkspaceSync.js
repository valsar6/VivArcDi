import { ElementGestures } from "../../core/ElementGestures.js";
import { Module } from "../../core/Module.js";
import { SerialTask } from "../../core/SerialTask.js";
import { Toast } from "../../core/Toast.js";
import { WorkspaceNames } from "../../core/WorkspaceNames.js";
import { WorkspaceTabs } from "../../core/WorkspaceTabs.js";
import { Debounce } from "./Debounce.js";
import { LocalPinned } from "./LocalPinned.js";
import { ReactEditorOpener } from "./EditorOpener.js";
import { MissingSpaces } from "./MissingSpaces.js";
import { PinnedApplier } from "./PinnedApplier.js";
import { Poll } from "./Poll.js";
import { QuietMoment } from "./QuietMoment.js";
import { ReactInternals } from "./ReactInternals.js";
import { SpaceBase } from "./SpaceBase.js";
import { SpaceIds } from "./SpaceIds.js";
import { SpaceList } from "./SpaceList.js";
import { SpaceSync } from "./SpaceSync.js";
import { SyncBase } from "./SyncBase.js";
import { SyncPass } from "./SyncPass.js";
import { SyncStore } from "./SyncStore.js";
import { WindowOwner } from "./WindowOwner.js";
import { WorkspaceCreator } from "./WorkspaceCreator.js";
import { WorkspaceMenu } from "./WorkspaceMenu.js";
import { DisabledRenamer, WorkspaceRenamer } from "./WorkspaceRenamer.js";
const SYNC_DELAY_MS = 500;
const QUIET_RETRY_MS = 5e3;
const TOAST_MS = 8e3;
class WorkspaceSync extends Module {
  static id = "workspace-sync";
  /**
   * Options accepted in `config.json`, with their defaults.
   */
  static defaults = Object.freeze({
    folder: "VivArcDi Sync",
    renameFromOtherComputers: true
  });
  #unsubscribe = [];
  #trigger = null;
  #names = null;
  #toast = null;
  #retry = null;
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
    this.#retry = new Debounce(() => trigger.request(), QUIET_RETRY_MS);
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
    this.#retry?.cancel();
    this.#names?.stop();
    this.#toast?.remove();
    this.#trigger = null;
    this.#retry = null;
    this.#names = null;
    this.#toast = null;
  }
  #pass(context, names) {
    const { tabs, windows, bookmarks, bookmarkWriter, storage, logger, document, selectors } = context;
    const folder = WorkspaceSync.#folderOf(context.options);
    const syncStore = new SyncStore(bookmarks, bookmarkWriter, folder);
    const syncBase = new SyncBase(storage);
    const local = new LocalPinned(tabs, names, logger);
    this.#toast = new Toast({ document, parent: document.querySelector(selectors.get("browser")) ?? document.body, durationMs: TOAST_MS });
    const toast = this.#toast;
    const menuParts = this.#menuParts(context, names);
    return new SyncPass({
      owner: new WindowOwner(windows),
      names,
      store: syncStore,
      base: syncBase,
      local,
      applier: new PinnedApplier(tabs, new WorkspaceTabs(tabs, logger), local, names),
      spaces: new SpaceSync({
        names,
        ids: new SpaceIds(storage),
        list: new SpaceList(bookmarks, bookmarkWriter, folder),
        base: new SpaceBase(storage),
        pinnedBase: syncBase,
        store: syncStore,
        creator: new WorkspaceCreator(menuParts),
        renamer: WorkspaceSync.#renamerOf(context.options, menuParts),
        missing: new MissingSpaces(storage, (text) => toast.show(text)),
        retry: () => this.#retry?.request(),
        logger
      }),
      logger
    });
  }
  #menuParts({ document, selectors, logger }, names) {
    const view = document.defaultView;
    if (view === null) {
      throw new Error("the document has no window");
    }
    const gestures = new ElementGestures(view);
    const poll = new Poll();
    const menu = new WorkspaceMenu(document, selectors, { gestures, poll, editor: new ReactEditorOpener(document, selectors, poll, new ReactInternals()) });
    return { menu, quiet: new QuietMoment(document), names, poll, logger };
  }
  static #renamerOf(options, parts) {
    return options.renameFromOtherComputers === false ? new DisabledRenamer() : new WorkspaceRenamer(parts);
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
  QUIET_RETRY_MS,
  SYNC_DELAY_MS,
  WorkspaceSync
};
