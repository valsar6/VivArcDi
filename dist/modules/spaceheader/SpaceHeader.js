import { ActiveWorkspace } from "../../core/ActiveWorkspace.js";
import { HiddenTabMarker } from "../../core/HiddenTabMarker.js";
import { HiddenTabs } from "../../core/HiddenTabs.js";
import { Module } from "../../core/Module.js";
import { SpaceCollapse } from "../../core/SpaceCollapse.js";
import { TabBarAnchor } from "../../core/TabBarAnchor.js";
import { WorkspaceNames } from "../../core/WorkspaceNames.js";
import { CollapsedPinned } from "./CollapsedPinned.js";
import { CollapsedSpaces } from "./CollapsedSpaces.js";
import { SpaceHeaderView } from "./SpaceHeaderView.js";
import { SpaceIcon } from "./SpaceIcon.js";
const ANCHOR_ORDER = 15;
const DEFAULT_NAME = "Tabs";
class SpaceHeader extends Module {
  static id = "space-header";
  #stops = [];
  #parts = null;
  /**
   * Shows a row above the folders of the tab bar with the icon and the name of the active
   * workspace, as the space header of Arc. A click collapses the workspace: the folders section
   * shows only the links that are open, and the pinned tabs that are unloaded are hidden. Each
   * workspace remembers its state after a restart. Outside any workspace, or when the list of
   * workspaces cannot be read, the row is named `Tabs`. Without `chrome.tabs` or the tab bar it
   * stays off.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn("chrome.tabs is missing: the space header is off");
      return;
    }
    try {
      this.#parts = this.#build(context);
      await this.#run(context, this.#parts);
    } catch (error) {
      this.stop();
      logger.warn("the space header is off", error);
    }
  }
  /**
   * Removes the row and every listener, opens the space and shows the hidden pinned tabs again.
   * The saved states stay.
   */
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
    this.#parts = null;
  }
  #build({ document, selectors, tabs, prefs, storage, logger }) {
    const collapse = SpaceCollapse.of(document);
    const hidden = HiddenTabs.of(document);
    const active = new ActiveWorkspace(tabs, (workspace) => void this.#show(workspace), logger);
    return {
      collapse,
      spaces: new CollapsedSpaces(storage, logger),
      view: new SpaceHeaderView(document, () => this.#toggle()),
      names: new WorkspaceNames(prefs, () => this.#render(), logger),
      active,
      marker: new HiddenTabMarker(document, selectors, hidden),
      pinned: new CollapsedPinned(tabs, { collapse, hidden, workspace: () => active.current }, logger)
    };
  }
  async #run({ document, selectors }, { collapse, view, names, active, marker, pinned }) {
    this.#stops.push(
      () => collapse.set(false),
      () => names.stop(),
      () => active.stop(),
      () => view.remove(),
      () => marker.stop(),
      () => pinned.stop(),
      collapse.onChange(() => this.#render())
    );
    await names.start();
    await active.start();
    this.#use(active.current);
    this.#stops.push(TabBarAnchor.of(document, selectors.get("tabListHost")).add(view.element, ANCHOR_ORDER));
    marker.start();
    await pinned.start();
    await active.refresh();
  }
  #toggle() {
    if (this.#parts !== null) {
      const { collapse, spaces } = this.#parts;
      const next = !collapse.collapsed;
      spaces.save(next);
      collapse.set(next);
    }
  }
  #render() {
    if (this.#parts !== null) {
      const { view, names, active, collapse } = this.#parts;
      view.render(SpaceHeader.#state(names, active.current, collapse.collapsed));
    }
  }
  #use(workspace) {
    if (this.#parts !== null) {
      this.#parts.spaces.useWorkspace(workspace);
      this.#parts.collapse.set(this.#parts.spaces.collapsed);
      this.#render();
    }
  }
  async #show(workspace) {
    if (this.#parts !== null) {
      if (!this.#parts.names.following) {
        await this.#parts.names.refresh();
      }
      this.#use(workspace);
      await this.#parts.pinned.refresh();
    }
  }
  static #state(names, workspace, collapsed) {
    const name = names.nameOf(workspace);
    return name === null ? { name: DEFAULT_NAME, icon: null, collapsed } : { name, icon: SpaceIcon.of(names.iconOf(workspace), name), collapsed };
  }
}
export {
  SpaceHeader
};
