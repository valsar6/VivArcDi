import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { SerialTask } from '../../core/SerialTask.js';
import { Toast } from '../../core/Toast.js';
import { WorkspaceNames } from '../../core/WorkspaceNames.js';
import { WorkspaceTabs } from '../../core/WorkspaceTabs.js';
import { Debounce } from './Debounce.js';
import { LocalPinned } from './LocalPinned.js';
import { MissingSpaces } from './MissingSpaces.js';
import { PinnedApplier } from './PinnedApplier.js';
import { SyncBase } from './SyncBase.js';
import { SyncPass } from './SyncPass.js';
import { SyncStore } from './SyncStore.js';
import { WindowOwner } from './WindowOwner.js';

export interface WorkspaceSyncSettings {
  /** The title of the bookmark folder that carries the data through Vivaldi Sync. */
  folder: string;
}

export const SYNC_DELAY_MS = 500;

const TOAST_MS = 8000;

export class WorkspaceSync extends Module {
  public static override id = 'workspace-sync';

  /**
   * Options accepted in `config.json`, with their defaults.
   */
  public static readonly defaults: Readonly<WorkspaceSyncSettings> = Object.freeze({
    folder: 'VivArcDi Sync',
  });

  #unsubscribe: Array<() => void> = [];
  #trigger: Debounce | null = null;
  #names: WorkspaceNames | null = null;
  #toast: Toast | null = null;

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
    this.#names?.stop();
    this.#toast?.remove();
    this.#trigger = null;
    this.#names = null;
    this.#toast = null;
  }

  #pass(context: ModuleContext, names: WorkspaceNames): SyncPass {
    const { tabs, windows, bookmarks, bookmarkWriter, storage, logger, document, selectors } = context;
    const folder = WorkspaceSync.#folderOf(context.options);
    const local = new LocalPinned(tabs, names, logger);
    this.#toast = new Toast({ document, parent: document.querySelector(selectors.get('browser')) ?? document.body, durationMs: TOAST_MS });
    const toast = this.#toast;
    return new SyncPass({
      owner: new WindowOwner(windows),
      names,
      store: new SyncStore(bookmarks, bookmarkWriter, folder),
      base: new SyncBase(storage),
      local,
      applier: new PinnedApplier(tabs, new WorkspaceTabs(tabs, logger), local, names),
      missing: new MissingSpaces(storage, (text) => toast.show(text)),
      logger,
    });
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
