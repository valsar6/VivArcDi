import { ActiveWorkspace } from '../../core/ActiveWorkspace.js';
import { ContextMenu } from '../../core/ContextMenu.js';
import type { MenuItem } from '../../core/ContextMenu.js';
import { LinkId } from '../../core/LinkId.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { SpaceMenuItems } from '../../core/SpaceMenuItems.js';
import { VirtualFolders } from '../../core/VirtualFolders.js';
import { GithubPullRequests } from './GithubPullRequests.js';
import type { GithubFetch } from './GithubPullRequests.js';
import { GithubToken } from './GithubToken.js';
import { LiveFolderMenu } from './LiveFolderMenu.js';
import { LiveFolderPublisher } from './LiveFolderPublisher.js';
import { defaultTicker, LiveFolderRefresher } from './LiveFolderRefresher.js';
import { LiveFolderStore } from './LiveFolderStore.js';
import { RepositoryEditor } from './RepositoryEditor.js';

const DEFAULT_REFRESH_MINUTES = 5;
const MIN_REFRESH_MINUTES = 1;
const MS_PER_MINUTE = 60_000;
const LIVE_FOLDERS_LABEL = 'Live Folders';
const GITHUB_LABEL = 'GitHub';

const sendWithFetch: GithubFetch = (url, init) => globalThis.fetch(url, init);

interface Parts {
  document: Document;
  virtual: VirtualFolders;
  store: LiveFolderStore;
  publisher: LiveFolderPublisher;
  menu: ContextMenu;
  editor: RepositoryEditor;
  active: ActiveWorkspace;
  refresher: LiveFolderRefresher;
  folderMenu: LiveFolderMenu;
}

export class LiveFolders extends Module {
  public static override id = 'live-folders';

  #stops: Array<() => void> = [];
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
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the live folders are off');
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
      logger.warn('the live folders are off', error);
    }
  }

  /**
   * Removes the live folders from the tab bar, stops refreshing and closes the menus. What is
   * stored stays.
   */
  public override stop(): void {
    this.#stopped = true;
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }

  #build({ document, selectors, tabs, storage, payload, options, logger }: ModuleContext): Parts {
    const virtual = VirtualFolders.of(document);
    const store = new LiveFolderStore(storage, logger);
    const publisher = new LiveFolderPublisher(store, virtual);
    const parent = (): Element => document.querySelector(selectors.get('browser')) ?? document.body;
    const menu = new ContextMenu({ document, parent });
    const editor = new RepositoryEditor({ document, parent });
    const refresher = new LiveFolderRefresher({
      store,
      github: new GithubPullRequests(sendWithFetch),
      token: new GithubToken(payload),
      changed: (): void => (this.#stopped ? undefined : publisher.publish()),
      ticker: defaultTicker,
      intervalMs: LiveFolders.#minutes(options['refreshMinutes']) * MS_PER_MINUTE,
      logger,
    });
    const folderMenu = new LiveFolderMenu({
      menu,
      editor,
      store,
      refresh: (folderId): void => refresher.refresh(folderId),
      remove: (folderId): void => this.#delete(store, publisher, folderId),
      anchor: (linkId): { x: number; y: number } | null => LiveFolders.#below(document, linkId),
    });
    const active = new ActiveWorkspace(tabs, (): void => undefined, logger);
    return { document, virtual, store, publisher, menu, editor, active, refresher, folderMenu };
  }

  #wire(parts: Parts): void {
    const { document, virtual, publisher, menu, editor, active, refresher } = parts;
    this.#stops.push(
      () => menu.close(),
      () => editor.close(),
      () => active.stop(),
      () => refresher.stop(),
      () => publisher.clear(),
      SpaceMenuItems.of(document).add((): MenuItem[] => [{ label: LIVE_FOLDERS_LABEL, items: [{ label: GITHUB_LABEL, run: (): void => this.#create(parts) }] }]),
      virtual.handle({
        rename: (id, name): void => this.#rename(parts, id, name),
        open: (id): void => this.#refresh(parts, id),
        menu: (id, x, y): void => parts.folderMenu.open(id, x, y),
      }),
    );
    publisher.publish();
    virtual.markReady();
  }

  #create({ store, publisher, virtual, refresher, active }: Parts): void {
    const folder = store.add(active.current);
    publisher.publish();
    virtual.reveal(LinkId.folder(folder.id));
    refresher.refresh(folder.id);
  }

  #rename({ store, publisher }: Parts, id: string, name: string): void {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null && store.update(folderId, { name })) {
      publisher.publish();
    }
  }

  #refresh({ refresher }: Parts, id: string): void {
    const folderId = LinkId.folderOf(id);
    if (folderId !== null) {
      refresher.refresh(folderId);
    }
  }

  #delete(store: LiveFolderStore, publisher: LiveFolderPublisher, folderId: string): void {
    store.remove(folderId);
    publisher.publish();
  }

  static #minutes(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(MIN_REFRESH_MINUTES, value) : DEFAULT_REFRESH_MINUTES;
  }

  static #below(document: Document, linkId: string): { x: number; y: number } | null {
    const row = document.querySelector<HTMLElement>(`[data-vivarcdi-folder-id="${linkId}"]`);
    const rect = row?.getBoundingClientRect();
    return rect === undefined ? null : { x: rect.left, y: rect.bottom };
  }
}
