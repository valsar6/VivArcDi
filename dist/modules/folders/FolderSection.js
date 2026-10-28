import { FrameTask } from "../../core/FrameTask.js";
import { HiddenTabMarker } from "../../core/HiddenTabMarker.js";
import { HiddenTabs } from "../../core/HiddenTabs.js";
import { TabBarAnchor } from "../../core/TabBarAnchor.js";
import { FolderRows } from "./FolderRows.js";
import { FolderSectionView } from "./FolderSectionView.js";
import { FolderTree } from "./FolderTree.js";
import { FolderTreeSource } from "./FolderTreeSource.js";
import { LinkActivator } from "./LinkActivator.js";
import { LinkTabAdopter } from "./LinkTabAdopter.js";
import { OpenFolders } from "./OpenFolders.js";
import { OpenLinks } from "./OpenLinks.js";
import { TabLinks } from "./TabLinks.js";
const ANCHOR_ORDER = 20;
const HIDDEN_OWNER = "bookmark-folders";
class FolderSection {
  #context;
  #redraw;
  #openFolders;
  #source;
  #openLinks;
  #tabLinks;
  #adopter;
  #view;
  #hiddenTabs;
  #hiddenMarker;
  #stops = [];
  /**
   * The section in the tab bar and everything it needs: the tree of the bookmarks, the tabs that
   * stand for the links, the folders that are open, and the clicks. The tabs of the links are
   * hidden from Vivaldi's tab list, since their rows stand for them.
   *
   * @param context What the module may use.
   * @param settings The root folder and the sizes.
   */
  constructor(context, { root, maxDepth, maxHeightPercent }) {
    const { document, selectors, tabs, bookmarks, logger } = context;
    const links = () => FolderTree.links(this.#source.entries);
    this.#context = context;
    this.#redraw = new FrameTask(() => this.#draw());
    this.#openFolders = new OpenFolders(context.storage, logger);
    this.#source = new FolderTreeSource(bookmarks, { path: root, maxDepth, onChange: () => this.#treeChanged(), logger });
    this.#openLinks = new OpenLinks(tabs, () => this.#tabsChanged(), logger);
    this.#tabLinks = new TabLinks(tabs);
    this.#adopter = new LinkTabAdopter(tabs, links, this.#tabLinks, logger);
    this.#hiddenTabs = HiddenTabs.of(document);
    this.#hiddenMarker = new HiddenTabMarker(document, selectors, this.#hiddenTabs);
    const activator = new LinkActivator(tabs, this.#openLinks, logger);
    this.#view = new FolderSectionView(
      document,
      {
        onFolder: (id) => this.#toggle(id),
        onLink: (link) => void activator.activate(link),
        onClose: (tabId) => void activator.close(tabId)
      },
      maxHeightPercent
    );
  }
  /**
   * Puts the section in the tab bar and starts following the bookmarks and the tabs. Tabs that
   * already show the address of a link become the tab of that link. Throws when the tab bar or
   * a tab event is missing; call `stop` then.
   */
  async start() {
    this.#openFolders.load();
    this.#stops.push(TabBarAnchor.of(this.#context.document, this.#context.selectors.get("tabListHost")).add(this.#view.element, ANCHOR_ORDER));
    this.#hiddenMarker.start();
    this.#stops.push(
      () => this.#hiddenMarker.stop(),
      () => this.#hiddenTabs.clear(HIDDEN_OWNER),
      () => this.#redraw.cancel(),
      () => this.#source.stop(),
      () => this.#openLinks.stop(),
      () => this.#adopter.stop()
    );
    await Promise.all([this.#source.start(), this.#openLinks.start()]);
    this.#adopter.start();
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
  #toggle(folderId) {
    this.#openFolders.toggle(folderId);
    this.#redraw.request();
  }
  #tabsChanged() {
    this.#hiddenTabs.set(HIDDEN_OWNER, this.#openLinks.linkedTabIds);
    this.#redraw.request();
  }
  #treeChanged() {
    this.#redraw.request();
    if (this.#source.found) {
      const ids = new Set(FolderTree.links(this.#source.entries).map((link) => link.id));
      this.#tabLinks.unlinkExcept(ids).catch((error) => this.#context.logger.warn("could not unlink the tabs of removed bookmarks", error));
    }
  }
  #draw() {
    const sources = {
      isOpen: (id) => this.#openFolders.has(id),
      tabFor: (link) => this.#openLinks.tabFor(link)
    };
    this.#view.render(FolderRows.build(this.#source.entries, sources));
  }
}
export {
  FolderSection
};
