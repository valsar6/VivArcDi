import { ActiveWorkspace } from '../../core/workspaces/ActiveWorkspace.js';
import { FrameTask } from '../../core/support/FrameTask.js';
import { HiddenTabMarker } from '../../shared/tabs/HiddenTabMarker.js';
import { HiddenTabs } from '../../shared/tabs/HiddenTabs.js';
import { LinkId } from '../../shared/links/LinkId.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { SpaceCollapse } from '../../shared/spaces/SpaceCollapse.js';
import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { VirtualFolders } from '../../shared/links/VirtualFolders.js';
import { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import { ClosingLinks } from './editing/ClosingLinks.js';
import { FolderEditing } from './editing/FolderEditing.js';
import { FolderRows } from './view/FolderRows.js';
import { FolderSectionView } from './view/FolderSectionView.js';
import { FolderTree } from '../../shared/links/FolderTree.js';
import type { LinkEntry, TreeEntry } from '../../shared/links/FolderEntries.js';
import { FolderTreeSource } from './tree/FolderTreeSource.js';
import { LinkActivator } from '../../shared/links/LinkActivator.js';
import { LinkTabAdopter } from './links/LinkTabAdopter.js';
import { OpenFolders } from './tree/OpenFolders.js';
import { OpenLinks } from '../../shared/links/OpenLinks.js';
import type { LinkRef, OpenTab } from '../../shared/links/OpenLinks.js';
import { TabLinks } from './links/TabLinks.js';
import type { WorkspaceRoots } from './tree/WorkspaceRoots.js';

const ANCHOR_ORDER = 20;
const HIDDEN_OWNER = 'bookmark-folders';

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
  #closing = new ClosingLinks();
  #openFolders: OpenFolders;
  #source: FolderTreeSource;
  #openLinks: OpenLinks;
  #tabLinks: TabLinks;
  #adopter: LinkTabAdopter;
  #editing: FolderEditing;
  #view: FolderSectionView;
  #hiddenTabs: HiddenTabs;
  #hiddenMarker: HiddenTabMarker;
  #collapse: SpaceCollapse;
  #virtual: VirtualFolders;
  #rootEmpty = true;
  #roots: WorkspaceRoots;
  #names: WorkspaceNames;
  #active: ActiveWorkspace;
  #workspace: string | null | undefined;
  #stops: Array<() => void> = [];

  /**
   * The section in the tab bar and everything it needs: the tree of the bookmarks, the tabs that
   * stand for the links, the folders that are open, and the clicks. The tabs of the links are
   * hidden from Vivaldi's tab list, since their rows stand for them. The folders that a source
   * fills, such as the live folders, are drawn after the bookmarks with the same rows; the
   * section opens them, renames them and reports their clicks through `VirtualFolders`.
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
    this.#hiddenTabs = HiddenTabs.of(document);
    this.#collapse = SpaceCollapse.of(document);
    this.#virtual = VirtualFolders.of(document);
    this.#hiddenMarker = new HiddenTabMarker(document, selectors, this.#hiddenTabs);
    const activator = new LinkActivator(tabs, this.#openLinks, logger);
    this.#view = new FolderSectionView(
      document,
      {
        onFolder: (id): void => this.#toggle(id),
        onLink: (link): void => (LinkId.isVirtual(link.id) && this.#virtual.activate(link.id) ? undefined : void activator.activate(link)),
        onClose: (tabId): void => void activator.close(tabId),
        onRename: (id, name): void => void this.#editing.rename(id, name),
        onMenu: (id, x, y): void => this.#virtual.openMenu(id, x, y),
      },
      maxHeightPercent,
    );
    this.#editing = this.#createEditing();
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
      this.#virtual.onChange(() => this.#virtualChanged()),
      this.#virtual.onReveal((id) => this.#reveal(id)),
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
    this.#editing.start();
    this.#stops.push(() => this.#editing.stop());
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

  #createEditing(): FolderEditing {
    return new FolderEditing(this.#context, this.#view, {
      root: (): string[] => this.#roots.rootFor(this.#names.nameOf(this.#workspace ?? null)),
      base: (): string[] => this.#roots.base,
      childIds: (): readonly string[] => this.#source.childIds,
      redraw: (): void => this.#redraw.request(),
      tabLinks: this.#tabLinks,
      openFolders: this.#openFolders,
      closing: this.#closing,
      names: this.#names,
      active: this.#active,
      roots: this.#roots,
    });
  }

  async #useWorkspace(workspace: string | null): Promise<void> {
    this.#workspace = workspace;
    const root = this.#roots.rootFor(this.#names.nameOf(workspace));
    this.#openFolders.useWorkspace(workspace);
    this.#rootEmpty = root.length === 0;
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

  #toggle(folderId: string): void {
    this.#openFolders.toggle(folderId);
    this.#redraw.request();
    if (this.#openFolders.has(folderId) && LinkId.isVirtual(folderId)) {
      this.#virtual.open(folderId);
    }
  }

  #reveal(folderId: string): void {
    if (!this.#openFolders.has(folderId)) {
      this.#openFolders.toggle(folderId);
    }
    this.#redraw.request();
  }

  #virtualChanged(): void {
    this.#redraw.request();
    this.#unlinkOrphans();
  }

  #tabsChanged(): void {
    this.#hiddenTabs.set(HIDDEN_OWNER, this.#openLinks.linkedTabIds);
    this.#redraw.request();
  }

  #treeChanged(): void {
    this.#redraw.request();
    this.#unlinkOrphans();
  }

  #unlinkOrphans(): void {
    const ids = this.#source.linkIds;
    const keep = (id: string): boolean => this.#closing.has(id) || (LinkId.isVirtual(id) && (!this.#virtual.ready || this.#virtual.has(id)));
    if (ids !== null) {
      this.#tabLinks.unlinkExcept(ids, keep).catch((error: unknown) => this.#context.logger.warn('could not unlink the tabs of removed bookmarks', error));
    }
  }

  #draw(): void {
    const sources = {
      isOpen: (id: string): boolean => this.#openFolders.has(id),
      tabFor: (link: LinkRef): OpenTab | undefined => this.#openLinks.tabFor(link),
    };
    const live = this.#virtual.entriesFor(this.#workspace ?? null);
    const entries: TreeEntry[] = [...this.#source.entries, ...live];
    this.#view.setEmpty(this.#rootEmpty && live.length === 0);
    this.#view.render(FolderRows.build(entries, sources, this.#collapse.collapsed));
  }
}
