import { ActiveWorkspace } from '../../core/workspaces/ActiveWorkspace.js';
import { HiddenTabMarker } from '../../shared/tabs/HiddenTabMarker.js';
import { ContextMenu } from '../../core/dom/ContextMenu.js';
import type { MenuItem } from '../../core/dom/ContextMenu.js';
import { FolderCommands } from '../../shared/links/FolderCommands.js';
import { HiddenTabs } from '../../shared/tabs/HiddenTabs.js';
import { Module } from '../../core/boot/Module.js';
import type { ModuleContext } from '../../core/boot/Module.js';
import { SpaceCollapse } from '../../shared/spaces/SpaceCollapse.js';
import { SpaceMenuItems } from '../../shared/spaces/SpaceMenuItems.js';
import { TabBarAnchor } from '../../core/dom/TabBarAnchor.js';
import { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import { CollapsedPinned } from './CollapsedPinned.js';
import { CollapsedSpaces } from './CollapsedSpaces.js';
import { SpaceHeaderView } from './SpaceHeaderView.js';
import type { SpaceHeaderState } from './SpaceHeaderView.js';
import { SpaceIcon } from './SpaceIcon.js';

const ANCHOR_ORDER = 15;
const DEFAULT_NAME = 'Tabs';
const NEW_FOLDER_LABEL = 'New Folder';

interface Parts {
  document: Document;
  collapse: SpaceCollapse;
  spaces: CollapsedSpaces;
  view: SpaceHeaderView;
  names: WorkspaceNames;
  active: ActiveWorkspace;
  marker: HiddenTabMarker;
  pinned: CollapsedPinned;
  menu: ContextMenu;
}

export class SpaceHeader extends Module {
  public static override id = 'space-header';

  #stops: Array<() => void> = [];
  #parts: Parts | null = null;

  /**
   * Shows a row above the folders of the tab bar with the icon and the name of the active
   * workspace, as the space header of Arc. A click collapses the workspace: the folders section
   * shows only the links that are open, and the pinned tabs that are unloaded are hidden. Each
   * workspace remembers its state after a restart. Outside any workspace, or when the list of
   * workspaces cannot be read, the row is named `Tabs`. A right click on the row opens a menu with
   * New Folder, the same as the `+`, and the items that other modules add. Without `chrome.tabs`
   * or the tab bar it stays off.
   *
   * @param context What the module may use.
   */
  public override async start(context: ModuleContext): Promise<void> {
    const { tabs, logger } = context;
    if (!tabs.available) {
      logger.warn('chrome.tabs is missing: the space header is off');
      return;
    }
    try {
      this.#parts = this.#build(context);
      await this.#run(context, this.#parts);
    } catch (error) {
      this.stop();
      logger.warn('the space header is off', error);
    }
  }

  /**
   * Removes the row and every listener, opens the space and shows the hidden pinned tabs again.
   * The saved states stay.
   */
  public override stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
    this.#parts = null;
  }

  #build({ document, selectors, tabs, prefs, storage, logger }: ModuleContext): Parts {
    const collapse = SpaceCollapse.of(document);
    const hidden = HiddenTabs.of(document);
    const active = new ActiveWorkspace(tabs, (workspace): void => void this.#show(workspace), logger);
    return {
      document,
      collapse,
      spaces: new CollapsedSpaces(storage, logger),
      view: new SpaceHeaderView(
        document,
        (): void => this.#toggle(),
        (): void => FolderCommands.of(document).requestNewFolder(),
        (x, y): void => this.#openMenu(x, y),
      ),
      names: new WorkspaceNames(prefs, (): void => this.#render(), logger),
      active,
      marker: new HiddenTabMarker(document, selectors, hidden),
      pinned: new CollapsedPinned(tabs, { collapse, hidden, workspace: (): string | null => active.current }, logger),
      menu: new ContextMenu({ document, parent: (): Element => document.querySelector(selectors.get('browser')) ?? document.body }),
    };
  }

  #openMenu(x: number, y: number): void {
    if (this.#parts !== null) {
      const { document } = this.#parts;
      const items: MenuItem[] = [{ label: NEW_FOLDER_LABEL, run: (): void => FolderCommands.of(document).requestNewFolder() }, ...SpaceMenuItems.of(document).items()];
      this.#parts.menu.open(items, x, y);
    }
  }

  async #run({ document, selectors }: ModuleContext, { collapse, view, names, active, marker, pinned, menu }: Parts): Promise<void> {
    this.#stops.push(
      () => menu.close(),
      () => collapse.set(false),
      () => names.stop(),
      () => active.stop(),
      () => view.remove(),
      () => marker.stop(),
      () => pinned.stop(),
      collapse.onChange(() => this.#render()),
    );
    await names.start();
    await active.start();
    this.#use(active.current);
    this.#stops.push(TabBarAnchor.of(document, selectors.get('tabListHost')).add(view.element, ANCHOR_ORDER));
    marker.start();
    await pinned.start();
    await active.refresh();
  }

  #toggle(): void {
    if (this.#parts !== null) {
      const { collapse, spaces } = this.#parts;
      const next = !collapse.collapsed;
      spaces.save(next);
      collapse.set(next);
    }
  }

  #render(): void {
    if (this.#parts !== null) {
      const { view, names, active, collapse } = this.#parts;
      view.render(SpaceHeader.#state(names, active.current, collapse.collapsed));
    }
  }

  #use(workspace: string | null): void {
    if (this.#parts !== null) {
      this.#parts.spaces.useWorkspace(workspace);
      this.#parts.collapse.set(this.#parts.spaces.collapsed);
      this.#render();
    }
  }

  async #show(workspace: string | null): Promise<void> {
    if (this.#parts !== null) {
      if (!this.#parts.names.following) {
        await this.#parts.names.refresh();
      }
      this.#use(workspace);
      await this.#parts.pinned.refresh();
    }
  }

  static #state(names: WorkspaceNames, workspace: string | null, collapsed: boolean): SpaceHeaderState {
    const name = names.nameOf(workspace);
    return name === null ? { name: DEFAULT_NAME, icon: null, collapsed } : { name, icon: SpaceIcon.of(names.iconOf(workspace), name), collapsed };
  }
}
