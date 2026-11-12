import { ActiveWorkspace } from '../../core/ActiveWorkspace.js';
import { ContextMenu } from '../../core/ContextMenu.js';
import type { MenuItem } from '../../core/ContextMenu.js';
import { LinkId } from '../../core/LinkId.js';
import { Module } from '../../core/Module.js';
import type { ModuleContext } from '../../core/Module.js';
import { SpaceMenuItems } from '../../core/SpaceMenuItems.js';
import { Toast } from '../../core/Toast.js';
import { VirtualFolders } from '../../core/VirtualFolders.js';
import { WorkspaceTabs } from '../../core/WorkspaceTabs.js';
import { TextCopier } from '../copyurl/UrlCopier.js';
import { GithubConnect } from './GithubConnect.js';
import { GithubConnection } from './GithubConnection.js';
import type { DeviceFetch } from './GithubDeviceFlow.js';
import { GithubPullRequests } from './GithubPullRequests.js';
import type { GithubFetch } from './GithubPullRequests.js';
import { LiveFolderHandlers } from './LiveFolderHandlers.js';
import { LiveFolderMenu } from './LiveFolderMenu.js';
import { LiveRowMenu } from './LiveRowMenu.js';
import { LiveFolderPublisher } from './LiveFolderPublisher.js';
import { defaultTicker, LiveFolderRefresher } from './LiveFolderRefresher.js';
import { LiveFolderStore } from './LiveFolderStore.js';
import { RepositoryEditor } from './RepositoryEditor.js';

const DEFAULT_REFRESH_MINUTES = 5;
const MIN_REFRESH_MINUTES = 1;
const MS_PER_MINUTE = 60_000;
const LIVE_FOLDERS_LABEL = 'Live Folders';
const GITHUB_LABEL = 'GitHub';
const TOAST_MS = 2000;
const CONNECTED_MS = 2000;

const sendWithFetch: GithubFetch = (url, init) => globalThis.fetch(url, init);
const postWithFetch: DeviceFetch = (url, init) => globalThis.fetch(url, init);

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
  rowMenu: LiveRowMenu;
  connection: GithubConnection;
  connect: GithubConnect;
  toast: Toast;
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
   * it is opened and when a filter changes. A folder that is not connected shows `Connect GitHub`,
   * which opens a panel with GitHub's sign-in code (the OAuth device flow, with the client id of
   * the `githubClientId` option); the token stays in the browser profile's storage. A right click
   * on a pull request offers `Copy Link` and `Archive Pull Request`. Without `chrome.tabs`, or
   * without a client id for the sign-in, there is nothing to connect.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the live folders are off');
      return;
    }
    if (LiveFolders.#clientId(context.options) === '') {
      logger.warn('githubClientId is empty: the live folders cannot connect to GitHub');
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

  #build({ document, selectors, tabs, storage, options, logger }: ModuleContext): Parts {
    const clientId = LiveFolders.#clientId(options);
    const virtual = VirtualFolders.of(document);
    const store = new LiveFolderStore(storage, logger);
    const connection = new GithubConnection({ storage, logger, send: sendWithFetch });
    const publisher = new LiveFolderPublisher(store, virtual, () => ({ configured: clientId !== '', connected: connection.connected }));
    const parent = (): Element => document.querySelector(selectors.get('browser')) ?? document.body;
    const menu = new ContextMenu({ document, parent });
    const editor = new RepositoryEditor({ document, parent });
    const active = new ActiveWorkspace(tabs, (): void => undefined, logger);
    const copier = TextCopier.for(document, document.defaultView?.navigator.clipboard);
    const toast = new Toast({ document, parent: parent(), durationMs: TOAST_MS });
    const refresher = new LiveFolderRefresher({
      store,
      github: new GithubPullRequests(sendWithFetch),
      connection,
      changed: (): void => (this.#stopped ? undefined : publisher.publish()),
      ticker: defaultTicker,
      intervalMs: LiveFolders.#minutes(options['refreshMinutes']) * MS_PER_MINUTE,
      logger,
    });
    const connect = new GithubConnect({ clientId, connection, send: postWithFetch, document, parent, copier, openPage: LiveFolders.#opener(tabs, active, logger), closeAfterMs: CONNECTED_MS, notify: (text, kind): void => toast.show(text, kind) });
    const folderMenu = new LiveFolderMenu({
      menu,
      editor,
      store,
      refresh: (folderId): void => refresher.refresh(folderId),
      remove: (folderId): void => this.#delete(store, publisher, folderId),
      connected: (): boolean => connection.connected,
      disconnect: (): void => connection.forget(),
      anchor: (linkId): { x: number; y: number } | null => LiveFolderHandlers.below(document, linkId),
    });
    const rowMenu = new LiveRowMenu({ menu, store, copier, toast: (text): void => toast.show(text), changed: (): void => publisher.publish() });
    return { document, virtual, store, publisher, menu, editor, active, refresher, folderMenu, rowMenu, connection, connect, toast };
  }

  #wire(parts: Parts): void {
    const { virtual, publisher, menu, editor, active, refresher, connection, connect, toast } = parts;
    const handlers = new LiveFolderHandlers(parts);
    this.#stops.push(
      () => menu.close(),
      () => editor.close(),
      () => connect.close(),
      () => toast.remove(),
      () => active.stop(),
      () => refresher.stop(),
      () => publisher.clear(),
      connection.onChange(() => this.#connectionChanged(parts)),
      SpaceMenuItems.of(parts.document).add((): MenuItem[] => [{ label: LIVE_FOLDERS_LABEL, items: [{ label: GITHUB_LABEL, run: (): void => this.#create(parts) }] }]),
      virtual.handle(handlers),
    );
    publisher.publish();
    virtual.markReady();
  }

  #connectionChanged({ publisher, refresher }: Parts): void {
    if (!this.#stopped) {
      publisher.publish();
      refresher.refreshAll();
    }
  }

  #create({ store, publisher, virtual, refresher, active }: Parts): void {
    const folder = store.add(active.current);
    publisher.publish();
    virtual.reveal(LinkId.folder(folder.id));
    refresher.refresh(folder.id);
  }

  #delete(store: LiveFolderStore, publisher: LiveFolderPublisher, folderId: string): void {
    store.remove(folderId);
    publisher.publish();
  }

  static #opener(tabs: ModuleContext['tabs'], active: ActiveWorkspace, logger: ModuleContext['logger']): (url: string) => void {
    const workspaceTabs = new WorkspaceTabs(tabs, logger);
    return (url): void => void workspaceTabs.open(url, active.current).catch((error: unknown) => logger.warn('could not open the GitHub page', error));
  }

  static #minutes(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(MIN_REFRESH_MINUTES, value) : DEFAULT_REFRESH_MINUTES;
  }

  static #clientId(options: Record<string, unknown>): string {
    const value = options['githubClientId'];
    return typeof value === 'string' ? value.trim() : '';
  }
}
