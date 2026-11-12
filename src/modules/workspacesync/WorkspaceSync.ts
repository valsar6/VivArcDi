import { ElementGestures } from './ElementGestures.js';
import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { SerialTask } from '../../core/support/SerialTask.js';
import { Toast } from '../../core/dom/Toast.js';
import { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import { WorkspaceTabs } from '../../core/workspaces/WorkspaceTabs.js';
import { Debounce } from './Debounce.js';
import { LocalPinned } from './LocalPinned.js';
import { ReactEditorOpener } from './EditorOpener.js';
import type { MenuParts } from './MenuCommand.js';
import { MissingSpaces } from './MissingSpaces.js';
import { PinnedApplier } from './PinnedApplier.js';
import { Poll } from './Poll.js';
import { QuietMoment } from './QuietMoment.js';
import { ReactInternals } from './ReactInternals.js';
import { SpaceBase } from './SpaceBase.js';
import { SpaceIds } from './SpaceIds.js';
import { SpaceList } from './SpaceList.js';
import { SpaceSync } from './SpaceSync.js';
import { SyncBase } from './SyncBase.js';
import { SyncPass } from './SyncPass.js';
import { SyncStore } from './SyncStore.js';
import { WindowOwner } from './WindowOwner.js';
import { WorkspaceCreator } from './WorkspaceCreator.js';
import { WorkspaceMenu } from './WorkspaceMenu.js';
import { DisabledRenamer, WorkspaceRenamer } from './WorkspaceRenamer.js';
import type { SpaceRenamer } from './WorkspaceRenamer.js';

export interface WorkspaceSyncSettings {
  /** The title of the bookmark folder that carries the data through Vivaldi Sync. */
  folder: string;
  /** Whether a workspace renamed on another computer is renamed here through Vivaldi's menu. */
  renameFromOtherComputers: boolean;
}

export const SYNC_DELAY_MS = 500;

export const QUIET_RETRY_MS = 5000;

const TOAST_MS = 8000;

export class WorkspaceSync extends Module {
  public static override id = 'workspace-sync';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<WorkspaceSyncSettings> = Object.freeze({
    folder: 'VivArcDi Sync',
    renameFromOtherComputers: true,
  });

  #unsubscribe: Array<() => void> = [];
  #trigger: Debounce | null = null;
  #names: WorkspaceNames | null = null;
  #toast: Toast | null = null;
  #retry: Debounce | null = null;

  /**
   * Keeps the pinned tabs of each workspace the same on every computer of the same Vivaldi
   * account. They are mirrored in a bookmark folder, which Vivaldi Sync carries, and merged with
   * the tabs after every change. Only one window of the browser does the merging. Without
   * `chrome.tabs`, `chrome.windows`, bookmarks or preferences the module stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, windows, bookmarks, bookmarkWriter, prefs, logger } = context;
    if (!tabs.available || !windows.available || !bookmarks.available || !bookmarkWriter.available || !prefs.available) {
      logger.warn('tabs, windows, bookmarks or preferences are missing: pinned tabs are not synced');
      return;
    }
    const names = new WorkspaceNames(prefs, () => this.#trigger?.request(), logger);
    this.#names = names;
    await names.start();
    const pass = this.#pass(context, names);
    const task = new SerialTask(() => pass.run(), (error) => logger.error('workspace sync failed', error));
    const trigger = new Debounce(() => task.request(), SYNC_DELAY_MS);
    this.#trigger = trigger;
    this.#retry = new Debounce(() => trigger.request(), QUIET_RETRY_MS);
    this.#subscribe(context, trigger);
    trigger.request();
  }

  /**
   * Removes every listener and the message.
   */
  public override stop(): void {
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

  #pass(context: ModuleContext, names: WorkspaceNames): SyncPass {
    const { tabs, windows, bookmarks, bookmarkWriter, storage, logger, document, selectors } = context;
    const folder = WorkspaceSync.#folderOf(context.options);
    const syncStore = new SyncStore(bookmarks, bookmarkWriter, folder);
    const syncBase = new SyncBase(storage);
    const local = new LocalPinned(tabs, names, logger);
    this.#toast = new Toast({ document, parent: document.querySelector(selectors.get('browser')) ?? document.body, durationMs: TOAST_MS });
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
        logger,
      }),
      logger,
    });
  }

  #menuParts({ document, selectors, logger }: ModuleContext, names: WorkspaceNames): MenuParts {
    const view = document.defaultView;
    if (view === null) {
      throw new Error('the document has no window');
    }
    const gestures = new ElementGestures(view);
    const poll = new Poll();
    const menu = new WorkspaceMenu(document, selectors, { gestures, poll, editor: new ReactEditorOpener(document, selectors, poll, new ReactInternals()) });
    return { menu, quiet: new QuietMoment(document), names, poll, logger };
  }

  static #renamerOf(options: Record<string, unknown>, parts: MenuParts): SpaceRenamer {
    return options.renameFromOtherComputers === false ? new DisabledRenamer() : new WorkspaceRenamer(parts);
  }

  #subscribe({ tabs, bookmarks, logger }: ModuleContext, trigger: Debounce): void {
    const request = (): void => trigger.request();
    try {
      this.#unsubscribe = [
        tabs.onCreated((tab) => tab.pinned && request()),
        tabs.onUpdated((_id, change, tab) => (change.pinned !== undefined || (tab.pinned && 'vivExtData' in change)) && request()),
        tabs.onRemoved(request),
        tabs.onMoved(request),
        bookmarks.onChange(request),
      ];
    } catch (error) {
      this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
      this.#unsubscribe = [];
      logger.warn('cannot follow tabs or bookmarks: pinned tabs are synced only when the workspaces change', error);
    }
  }

  static #folderOf(options: Record<string, unknown>): string {
    const { folder } = options;
    return typeof folder === 'string' && folder.trim() !== '' ? folder.trim() : WorkspaceSync.defaults.folder;
  }
}
