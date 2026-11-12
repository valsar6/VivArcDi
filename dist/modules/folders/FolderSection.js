import { ActiveWorkspace } from "../../core/ActiveWorkspace.js";
import { FrameTask } from "../../core/FrameTask.js";
import { HiddenTabMarker } from "../../core/HiddenTabMarker.js";
import { HiddenTabs } from "../../core/HiddenTabs.js";
import { LinkId } from "../../core/LinkId.js";
import { SpaceCollapse } from "../../core/SpaceCollapse.js";
import { TabBarAnchor } from "../../core/TabBarAnchor.js";
import { VirtualFolders } from "../../core/VirtualFolders.js";
import { WorkspaceNames } from "../../core/WorkspaceNames.js";
import { ClosingLinks } from "./editing/ClosingLinks.js";
import { FolderEditing } from "./editing/FolderEditing.js";
import { FolderRows } from "./view/FolderRows.js";
import { FolderSectionView } from "./view/FolderSectionView.js";
import { FolderTree } from "../../shared/links/FolderTree.js";
import { FolderTreeSource } from "./tree/FolderTreeSource.js";
import { LinkActivator } from "../../shared/links/LinkActivator.js";
import { LinkTabAdopter } from "./links/LinkTabAdopter.js";
import { OpenFolders } from "./tree/OpenFolders.js";
import { OpenLinks } from "../../shared/links/OpenLinks.js";
import { TabLinks } from "./links/TabLinks.js";
const ANCHOR_ORDER = 20;
const HIDDEN_OWNER = "bookmark-folders";
class FolderSection {
  #context;
  #redraw;
  #closing = new ClosingLinks();
  #openFolders;
  #source;
  #openLinks;
  #tabLinks;
  #adopter;
  #editing;
  #view;
  #hiddenTabs;
  #hiddenMarker;
  #collapse;
  #virtual;
  #rootEmpty = true;
  #roots;
  #names;
  #active;
  #workspace;
  #stops = [];
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
  constructor(context, { roots, maxDepth, maxHeightPercent }) {
    const { document, selectors, tabs, bookmarks, prefs, logger } = context;
    const links = () => FolderTree.links(this.#source.entries);
    this.#context = context;
    this.#redraw = new FrameTask(() => this.#draw());
    this.#openFolders = new OpenFolders(context.storage, logger);
    this.#roots = roots;
    this.#names = new WorkspaceNames(prefs, () => this.#namesChanged(), logger);
    this.#active = new ActiveWorkspace(tabs, (workspace) => void this.#show(workspace), logger);
    this.#source = new FolderTreeSource(bookmarks, {
      path: [],
      maxDepth,
      otherPaths: roots.allPaths,
      optionalPaths: () => roots.pathsFor([...this.#names.names, null]),
      onChange: () => this.#treeChanged(),
      logger
    });
    this.#openLinks = new OpenLinks(tabs, () => this.#tabsChanged(), logger);
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
        onFolder: (id) => this.#toggle(id),
        onLink: (link) => LinkId.isVirtual(link.id) && this.#virtual.activate(link.id) ? void 0 : void activator.activate(link),
        onClose: (tabId) => void activator.close(tabId),
        onRename: (id, name) => void this.#editing.rename(id, name),
        onMenu: (id, x, y) => this.#virtual.openMenu(id, x, y)
      },
      maxHeightPercent
    );
    this.#editing = this.#createEditing();
  }
  /**
   * Puts the section in the tab bar and starts following the bookmarks, the tabs and the active
   * workspace, whose root it shows, and the collapsed state of the space. Tabs that already show
   * the address of a link become the tab of that link. Throws when the tab bar or a tab event is
   * missing; call `stop` then.
   */
  async start() {
    this.#stops.push(TabBarAnchor.of(this.#context.document, this.#context.selectors.get("tabListHost")).add(this.#view.element, ANCHOR_ORDER));
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
      () => this.#names.stop()
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
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
  #createEditing() {
    return new FolderEditing(this.#context, this.#view, {
      root: () => this.#roots.rootFor(this.#names.nameOf(this.#workspace ?? null)),
      base: () => this.#roots.base,
      childIds: () => this.#source.childIds,
      redraw: () => this.#redraw.request(),
      tabLinks: this.#tabLinks,
      openFolders: this.#openFolders,
      closing: this.#closing
    });
  }
  async #useWorkspace(workspace) {
    this.#workspace = workspace;
    const root = this.#roots.rootFor(this.#names.nameOf(workspace));
    this.#openFolders.useWorkspace(workspace);
    this.#rootEmpty = root.length === 0;
    await this.#source.useRoot(root);
  }
  async #show(workspace) {
    if (!this.#names.following) {
      await this.#names.refresh();
    }
    await this.#useWorkspace(workspace);
    this.#redraw.request();
  }
  #namesChanged() {
    if (this.#workspace !== void 0) {
      void this.#useWorkspace(this.#workspace);
    }
  }
  #toggle(folderId) {
    this.#openFolders.toggle(folderId);
    this.#redraw.request();
    if (this.#openFolders.has(folderId) && LinkId.isVirtual(folderId)) {
      this.#virtual.open(folderId);
    }
  }
  #reveal(folderId) {
    if (!this.#openFolders.has(folderId)) {
      this.#openFolders.toggle(folderId);
    }
    this.#redraw.request();
  }
  #virtualChanged() {
    this.#redraw.request();
    this.#unlinkOrphans();
  }
  #tabsChanged() {
    this.#hiddenTabs.set(HIDDEN_OWNER, this.#openLinks.linkedTabIds);
    this.#redraw.request();
  }
  #treeChanged() {
    this.#redraw.request();
    this.#unlinkOrphans();
  }
  #unlinkOrphans() {
    const ids = this.#source.linkIds;
    const keep = (id) => this.#closing.has(id) || LinkId.isVirtual(id) && (!this.#virtual.ready || this.#virtual.has(id));
    if (ids !== null) {
      this.#tabLinks.unlinkExcept(ids, keep).catch((error) => this.#context.logger.warn("could not unlink the tabs of removed bookmarks", error));
    }
  }
  #draw() {
    const sources = {
      isOpen: (id) => this.#openFolders.has(id),
      tabFor: (link) => this.#openLinks.tabFor(link)
    };
    const live = this.#virtual.entriesFor(this.#workspace ?? null);
    const entries = [...this.#source.entries, ...live];
    this.#view.setEmpty(this.#rootEmpty && live.length === 0);
    this.#view.render(FolderRows.build(entries, sources, this.#collapse.collapsed));
  }
}
export {
  FolderSection
};
