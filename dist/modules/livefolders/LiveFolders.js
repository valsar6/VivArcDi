import { ActiveWorkspace } from "../../core/ActiveWorkspace.js";
import { ContextMenu } from "../../core/ContextMenu.js";
import { LinkId } from "../../core/LinkId.js";
import { Module } from "../../core/Module.js";
import { SpaceMenuItems } from "../../core/SpaceMenuItems.js";
import { VirtualFolders } from "../../core/VirtualFolders.js";
import { GithubPullRequests } from "./GithubPullRequests.js";
import { GithubToken } from "./GithubToken.js";
import { LiveFolderMenu } from "./LiveFolderMenu.js";
import { LiveFolderPublisher } from "./LiveFolderPublisher.js";
import { defaultTicker, LiveFolderRefresher } from "./LiveFolderRefresher.js";
import { LiveFolderStore } from "./LiveFolderStore.js";
import { RepositoryEditor } from "./RepositoryEditor.js";
const DEFAULT_REFRESH_MINUTES = 5;
const MIN_REFRESH_MINUTES = 1;
const MS_PER_MINUTE = 6e4;
const LIVE_FOLDERS_LABEL = "Live Folders";
const GITHUB_LABEL = "GitHub";
const sendWithFetch = (url, init) => globalThis.fetch(url, init);
class LiveFolders extends Module {
  static id = "live-folders";
  #stops = [];
  #stopped = true;
  /**
   * Live folders, as in Arc: a folder of the tab bar that fills itself from GitHub with the open
   * pull requests the user created or is asked to review. The space menu (right click on the
   * space header) creates one, and its own menu filters it by list, drafts and repositories,
   * refreshes it and deletes it. Folders, filters and last rows are kept per workspace; the rows
   * are not bookmarks. A folder refreshes at the start, every `refreshMinutes` (default 5), when
   * it is opened and when a filter changes. The token comes from `vivarcdi live-folders token`.
   * Without `chrome.tabs` it stays off.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn("chrome.tabs is missing: the live folders are off");
      return;
    }
    this.#stopped = false;
    const parts = this.#build(context);
    this.#wire(parts);
    try {
      await parts.active.start();
      if (!this.#stopped) {
        parts.refresher.start();
      }
    } catch (error) {
      this.stop();
      logger.warn("the live folders are off", error);
    }
  }
  /**
   * Removes the live folders from the tab bar, stops refreshing and closes the menus. What is
   * stored stays.
   */
  stop() {
    this.#stopped = true;
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
  #build({ document, selectors, tabs, storage, payload, options, logger }) {
    const virtual = VirtualFolders.of(document);
    const store = new LiveFolderStore(storage, logger);
    const publisher = new LiveFolderPublisher(store, virtual);
    const parent = () => document.querySelector(selectors.get("browser")) ?? document.body;
    const menu = new ContextMenu({ document, parent });
    const editor = new RepositoryEditor({ document, parent });
    const refresher = new LiveFolderRefresher({
      store,
      github: new GithubPullRequests(sendWithFetch),
      token: new GithubToken(payload),
      changed: () => this.#stopped ? void 0 : publisher.publish(),
      ticker: defaultTicker,
      intervalMs: LiveFolders.#minutes(options["refreshMinutes"]) * MS_PER_MINUTE,
      logger
    });
    const folderMenu = new LiveFolderMenu({
      menu,
      editor,
      store,
      refresh: (folderId) => refresher.refresh(folderId),
      remove: (folderId) => this.#delete(store, publisher, folderId),
      anchor: (linkId) => LiveFolders.#below(document, linkId)
    });
    const active = new ActiveWorkspace(tabs, () => void 0, logger);
    return { document, virtual, store, publisher, menu, editor, active, refresher, folderMenu };
  }
  #wire(parts) {
    const { document, virtual, publisher, menu, editor, active, refresher } = parts;
    this.#stops.push(
      () => menu.close(),
      () => editor.close(),
      () => active.stop(),
      () => refresher.stop(),
      () => publisher.clear(),
      SpaceMenuItems.of(document).add(() => [{ label: LIVE_FOLDERS_LABEL, items: [{ label: GITHUB_LABEL, run: () => this.#create(parts) }] }]),
      virtual.handle({
        rename: (id, name) => this.#rename(parts, id, name),
        open: (id) => this.#refresh(parts, id),
        menu: (id, x, y) => parts.folderMenu.open(id, x, y)
      })
    );
    publisher.publish();
    virtual.markReady();
  }
  #create({ store, publisher, virtual, refresher, active }) {
    const folder = store.add(active.current);
    publisher.publish();
    virtual.reveal(LinkId.folder(folder.id));
    refresher.refresh(folder.id);
  }
  #rename({ store, publisher }, id, name) {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null && store.update(folderId, { name })) {
      publisher.publish();
    }
  }
  #refresh({ refresher }, id) {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null) {
      refresher.refresh(folderId);
    }
  }
  #delete(store, publisher, folderId) {
    store.remove(folderId);
    publisher.publish();
  }
  static #minutes(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(MIN_REFRESH_MINUTES, value) : DEFAULT_REFRESH_MINUTES;
  }
  static #below(document, linkId) {
    const row = document.querySelector(`[data-vivarcdi-folder-id="${linkId}"]`);
    const rect = row?.getBoundingClientRect();
    return rect === void 0 ? null : { x: rect.left, y: rect.bottom };
  }
}
export {
  LiveFolders
};
