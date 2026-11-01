import { ActiveWorkspace } from '../../core/ActiveWorkspace.js';
import { FolderCommands } from '../../core/FolderCommands.js';
import { FrameTask } from '../../core/FrameTask.js';
import { HiddenTabMarker } from '../../core/HiddenTabMarker.js';
import { HiddenTabs } from '../../core/HiddenTabs.js';
import type { ModuleContext } from '../../core/Module.js';
import { SpaceCollapse } from '../../core/SpaceCollapse.js';
import { TabBarAnchor } from '../../core/TabBarAnchor.js';
import { Toast } from '../../core/Toast.js';
import { WorkspaceNames } from '../../core/WorkspaceNames.js';
import { CreatedLinks } from './CreatedLinks.js';
import { FavoriteShortcut } from './FavoriteShortcut.js';
import { FolderRows } from './FolderRows.js';
import { FolderSectionView } from './FolderSectionView.js';
import { FolderTree } from './FolderTree.js';
import type { LinkEntry } from './FolderTree.js';
import { FolderTreeSource } from './FolderTreeSource.js';
import { LinkActivator } from './LinkActivator.js';
import { LinkTabAdopter } from './LinkTabAdopter.js';
import { OpenFolders } from './OpenFolders.js';
import { OpenLinks } from './OpenLinks.js';
import type { LinkRef, OpenTab } from './OpenLinks.js';
import { TabLinks } from './TabLinks.js';
import { WorkspaceFavorites } from './WorkspaceFavorites.js';
import type { WorkspaceRoots } from './WorkspaceRoots.js';

const ANCHOR_ORDER = 20;
const HIDDEN_OWNER = 'bookmark-folders';
const TOAST_MS = 2000;

export interface SectionSettings {
  /** The root folder of each workspace. */
  roots: WorkspaceRoots;
  /** How many levels of folders are shown. */
  maxDepth: number;
  /** The most the section may take of the window's height, in percent. */
  maxHeightPercent: number;
}

export class FolderSection {
  #context: ModuleContext;
  #redraw: FrameTask;
  #openFolders: OpenFolders;
  #source: FolderTreeSource;
  #openLinks: OpenLinks;
  #tabLinks: TabLinks;
  #adopter: LinkTabAdopter;
  #favorites: WorkspaceFavorites;
  #view: FolderSectionView;
  #hiddenTabs: HiddenTabs;
  #hiddenMarker: HiddenTabMarker;
  #collapse: SpaceCollapse;
  #roots: WorkspaceRoots;
  #names: WorkspaceNames;
  #active: ActiveWorkspace;
  #workspace: string | null | undefined;
  #stops: Array<() => void> = [];

  /**
   * The section in the tab bar and everything it needs: the tree of the bookmarks, the tabs that
   * stand for the links, the folders that are open, and the clicks. The tabs of the links are
   * hidden from Vivaldi's tab list, since their rows stand for them.
   *
   * @param context What the module may use.
   * @param settings The root folders and the sizes.
   */
  constructor(context: ModuleContext, { roots, maxDepth, maxHeightPercent }: SectionSettings) {
    const { document, selectors, tabs, bookmarks, prefs, logger } = context;
    const links = (): LinkEntry[] => FolderTree.links(this.#source.entries);
    this.#context = context;
    this.#redraw = new FrameTask(() => this.#draw());
    this.#openFolders = new OpenFolders(context.storage, logger);
    this.#roots = roots;
    this.#names = new WorkspaceNames(prefs, (): void => this.#namesChanged(), logger);
    this.#active = new ActiveWorkspace(tabs, (workspace): void => void this.#show(workspace), logger);
    this.#source = new FolderTreeSource(bookmarks, {
      path: [],
      maxDepth,
      otherPaths: roots.allPaths,
      optionalPaths: (): string[][] => roots.pathsFor([...this.#names.names, null]),
      onChange: (): void => this.#treeChanged(),
      logger,
    });
    this.#openLinks = new OpenLinks(tabs, (): void => this.#tabsChanged(), logger);
    this.#tabLinks = new TabLinks(tabs);
    this.#adopter = new LinkTabAdopter(tabs, links, this.#tabLinks, logger);
    this.#favorites = this.#createFavorites();
    this.#hiddenTabs = HiddenTabs.of(document);
    this.#collapse = SpaceCollapse.of(document);
    this.#hiddenMarker = new HiddenTabMarker(document, selectors, this.#hiddenTabs);
    const activator = new LinkActivator(tabs, this.#openLinks, logger);
    this.#view = new FolderSectionView(
      document,
      {
        onFolder: (id): void => this.#toggle(id),
        onLink: (link): void => void activator.activate(link),
        onClose: (tabId): void => void activator.close(tabId),
        onRename: (id, name): void => void this.#rename(id, name),
      },
      maxHeightPercent,
    );
  }

  /**
   * Puts the section in the tab bar and starts following the bookmarks, the tabs and the active
   * workspace, whose root it shows, and the collapsed state of the space. Tabs that already show
   * the address of a link become the tab of that link. Throws when the tab bar or a tab event is
   * missing; call `stop` then.
   */
  public async start(): Promise<void> {
    this.#stops.push(TabBarAnchor.of(this.#context.document, this.#context.selectors.get('tabListHost')).add(this.#view.element, ANCHOR_ORDER));
    this.#hiddenMarker.start();
    this.#stops.push(
      this.#collapse.onChange(() => this.#redraw.request()),
      () => this.#hiddenMarker.stop(),
      () => this.#hiddenTabs.clear(HIDDEN_OWNER),
      () => this.#redraw.cancel(),
      () => this.#source.stop(),
      () => this.#openLinks.stop(),
      () => this.#adopter.stop(),
      () => this.#active.stop(),
      () => this.#names.stop(),
    );
    await this.#names.start();
    await this.#active.start();
    await this.#useWorkspace(this.#active.current);
    await Promise.all([this.#source.start(), this.#openLinks.start(), this.#active.refresh()]);
    this.#adopter.start();
    this.#startShortcut();
    this.#stops.push(FolderCommands.of(this.#context.document).onNewFolder(() => void this.#newFolder()));
    await this.#adopter.adoptOpenTabs();
    await this.#openLinks.refresh();
    this.#draw();
  }

  /**
   * Removes the section and every listener, and shows the hidden tabs in the list again.
   */
  public stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }

  #createFavorites(): WorkspaceFavorites {
    return new WorkspaceFavorites({
      writer: this.#context.bookmarkWriter,
      links: this.#tabLinks,
      created: new CreatedLinks(this.#context.storage),
      root: (): string[] => this.#roots.rootFor(this.#names.nameOf(this.#workspace ?? null)),
      logger: this.#context.logger,
    });
  }

  #startShortcut(): void {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    if (!bookmarkWriter.available) {
      logger.warn('chrome.bookmarks cannot write: the favorites shortcut is off');
      return;
    }
    const toast = new Toast({ document, parent: document.querySelector(selectors.get('browser')) ?? document.body, durationMs: TOAST_MS });
    const shortcut = new FavoriteShortcut({
      document,
      activeTab: async (): Promise<chrome.tabs.Tab | undefined> => (await tabs.query({ active: true, currentWindow: true }))[0],
      favorites: this.#favorites,
      notify: (text): void => toast.show(text),
      logger,
    });
    shortcut.attach();
    this.#stops.push(() => shortcut.detach(), () => toast.remove());
  }

  async #useWorkspace(workspace: string | null): Promise<void> {
    this.#workspace = workspace;
    const root = this.#roots.rootFor(this.#names.nameOf(workspace));
    this.#openFolders.useWorkspace(workspace);
    this.#view.setEmpty(root.length === 0);
    await this.#source.useRoot(root);
  }

  async #show(workspace: string | null): Promise<void> {
    if (!this.#names.following) {
      await this.#names.refresh();
    }
    await this.#useWorkspace(workspace);
    this.#redraw.request();
  }

  #namesChanged(): void {
    if (this.#workspace !== undefined) {
      void this.#useWorkspace(this.#workspace);
    }
  }

  async #rename(folderId: string, name: string): Promise<void> {
    try {
      await this.#context.bookmarkWriter.update(folderId, name);
    } catch (error) {
      this.#context.logger.warn('could not rename the folder', error);
      this.#redraw.request();
    }
  }

  async #newFolder(): Promise<void> {
    const id = await this.#favorites.addFolder();
    if (id !== null) {
      this.#view.edit(id);
    }
  }

  #toggle(folderId: string): void {
    this.#openFolders.toggle(folderId);
    this.#redraw.request();
  }

  #tabsChanged(): void {
    this.#hiddenTabs.set(HIDDEN_OWNER, this.#openLinks.linkedTabIds);
    this.#redraw.request();
  }

  #treeChanged(): void {
    this.#redraw.request();
    const ids = this.#source.linkIds;
    if (ids !== null) {
      this.#tabLinks.unlinkExcept(ids).catch((error: unknown) => this.#context.logger.warn('could not unlink the tabs of removed bookmarks', error));
    }
  }

  #draw(): void {
    const sources = {
      isOpen: (id: string): boolean => this.#openFolders.has(id),
      tabFor: (link: LinkRef): OpenTab | undefined => this.#openLinks.tabFor(link),
    };
    this.#view.render(FolderRows.build(this.#source.entries, sources, this.#collapse.collapsed));
  }
}
