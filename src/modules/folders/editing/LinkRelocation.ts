import type { BookmarkWriter } from '../../../core/browser/bookmarks/BookmarkWriter.js';
import type { CommandItem, SubmenuItem } from '../../../core/dom/ContextMenu.js';
import type { Logger } from '../../../core/support/Logger.js';
import { TabData } from '../../../core/tabs/TabData.js';
import type { TabDataWriter } from '../../../core/tabs/TabDataWriter.js';
import type { Toast } from '../../../core/dom/Toast.js';
import type { ActiveWorkspace } from '../../../core/workspaces/ActiveWorkspace.js';
import type { WorkspaceListing, WorkspaceNames } from '../../../core/workspaces/WorkspaceNames.js';
import type { MenuResult } from '../../../shared/spaces/MenuCommand.js';
import type { ClosingLinks } from './ClosingLinks.js';
import type { LinkedTab } from '../../../shared/linkmenu/LinkedTab.js';
import type { PromptDialog } from '../../../shared/linkmenu/PromptDialog.js';
import type { WorkspaceSwitcher } from './WorkspaceSwitcher.js';
import type { WorkspaceRoots } from '../tree/WorkspaceRoots.js';

export const MOVE_TO_LABEL = 'Move to';
export const NEW_SPACE_LABEL = 'New Space…';
export const MOVED_TEXT = 'Tab moved! Click to go there.';

export interface LinkRelocationDependencies {
  writer: Pick<BookmarkWriter, 'subTree' | 'move' | 'ensurePath'>;
  linkedTab: Pick<LinkedTab, 'of'>;
  tabData: Pick<TabDataWriter, 'write'>;
  names: Pick<WorkspaceNames, 'entries' | 'names' | 'idOf'>;
  active: Pick<ActiveWorkspace, 'current'>;
  roots: Pick<WorkspaceRoots, 'rootFor'>;
  hold: Pick<ClosingLinks, 'add' | 'clear'>;
  creator: { create: (name: string) => Promise<MenuResult> };
  switcher: Pick<WorkspaceSwitcher, 'to'>;
  dialog: Pick<PromptDialog, 'ask'>;
  toast: Pick<Toast, 'show' | 'remove'>;
  logger: Logger;
}

export class LinkRelocation {
  #deps: LinkRelocationDependencies;

  /**
   * Moves a saved tab (a bookmarked link) to another workspace: the bookmark goes to the end of
   * that workspace's root and only the open tab of the row gets the workspace. A toast then lets
   * the user follow it. When the bookmark cannot move, nothing changes and the user is told.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: LinkRelocationDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param linkId The bookmark id of the link.
   * @returns `Move to` with one command per workspace, the current one checked, then `New Space…`; null when Vivaldi lists no workspace.
   */
  public submenu(linkId: string): SubmenuItem | null {
    const { names, active } = this.#deps;
    if (names.entries.length === 0) {
      return null;
    }
    const spaces = names.entries.map((entry): CommandItem => {
      const checked = entry.id === active.current;
      return { label: entry.name, checked, run: (): void => (checked ? undefined : void this.move(linkId, entry)) };
    });
    const create: CommandItem = { label: NEW_SPACE_LABEL, run: (): void => void this.moveToNewSpace(linkId) };
    return { label: MOVE_TO_LABEL, items: [...spaces, { separator: true }, create] };
  }

  /**
   * @param linkId The bookmark id of the link.
   * @param workspace The workspace that receives it.
   */
  public async move(linkId: string, workspace: WorkspaceListing): Promise<void> {
    const { hold, toast, writer, linkedTab } = this.#deps;
    let name = linkId;
    try {
      name = (await writer.subTree(linkId)).title;
      const targetRootId = await writer.ensurePath(this.#deps.roots.rootFor(workspace.name));
      if (targetRootId === (await this.#currentRootId())) {
        toast.show(`"${name}" is already there`);
        return;
      }
      const tabId = (await linkedTab.of(linkId))?.id;
      hold.add([linkId]);
      await writer.move(linkId, { parentId: targetRootId });
      await this.#send(tabId, workspace.id);
      this.#announce(name, workspace, tabId);
    } catch (error) {
      this.#deps.logger.warn('could not move the saved tab', error);
      toast.show(`Could not move "${name}"`, 'error');
    } finally {
      hold.clear([linkId]);
    }
  }

  /**
   * Asks for a name, creates the workspace and moves the saved tab into it. An empty name or
   * Escape creates nothing.
   *
   * @param linkId The bookmark id of the link.
   */
  public async moveToNewSpace(linkId: string): Promise<void> {
    const { dialog, creator, names, toast } = this.#deps;
    const name = await dialog.ask({
      title: 'New Space',
      label: 'Name',
      value: '',
      confirm: 'Create',
      validate: (value): string | null => this.#refusal(value),
    });
    if (name === null || name === '') {
      return;
    }
    const result = await creator.create(name);
    const id = result === 'done' ? names.idOf(name) : null;
    const created = names.entries.find((entry) => entry.id === id);
    if (created === undefined) {
      toast.show('Could not create the space', 'error');
      return;
    }
    await this.move(linkId, created);
  }

  /**
   * Removes the toast from the window.
   */
  public dispose(): void {
    this.#deps.toast.remove();
  }

  #refusal(value: string): string | null {
    if (value === '') {
      return 'Enter a name';
    }
    return this.#deps.names.names.includes(value) ? 'A space with that name already exists' : null;
  }

  #announce(name: string, workspace: WorkspaceListing, tabId: number | undefined): void {
    const { toast, switcher } = this.#deps;
    if (tabId === undefined) {
      toast.show(`Moved "${name}" to ${workspace.name}`);
      return;
    }
    toast.show(MOVED_TEXT, 'ok', () => void switcher.to(tabId));
  }

  async #currentRootId(): Promise<string | null> {
    const { names, active, roots, writer } = this.#deps;
    const current = names.entries.find((entry) => entry.id === active.current)?.name ?? null;
    const path = roots.rootFor(current);
    return path.length === 0 ? null : writer.ensurePath(path);
  }

  async #send(tabId: number | undefined, workspaceId: string): Promise<void> {
    if (tabId === undefined) {
      return;
    }
    try {
      await this.#deps.tabData.write(tabId, (tab) => TabData.withWorkspace(TabData.dataOf(tab), workspaceId));
    } catch (error) {
      this.#deps.logger.warn('could not move the tab of the saved tab', error);
    }
  }
}
