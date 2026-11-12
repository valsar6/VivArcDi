import { MenuCommand } from './MenuCommand.js';
import type { MenuParts } from './MenuCommand.js';

export interface SpaceRenamer {
  /**
   * @param currentName The name of the workspace here.
   * @param newName The name to give it.
   * @returns Whether the workspace has the new name now.
   */
  rename: (currentName: string, newName: string) => Promise<boolean>;
}

export class WorkspaceRenamer extends MenuCommand implements SpaceRenamer {
  /**
   * Renames a workspace through the inline editor of Vivaldi's menu: opens the menu, opens the
   * editor of the workspace row, writes the new name and presses save. It is a class of its own
   * behind `SpaceRenamer`, so that the way of opening the editor can change or the renaming be
   * switched off (`renameFromOtherComputers`) without touching the rest.
   *
   * @param parts Everything the command collaborates with.
   */
  constructor(parts: MenuParts) {
    super(parts);
  }

  public async rename(currentName: string, newName: string): Promise<boolean> {
    const { menu } = this.parts;
    const result = await this.attempt(async () => {
      await menu.open();
      await menu.startRename(currentName);
      await menu.writeName(newName);
      await menu.save();
      await this.listed(newName);
    }, `renaming "${currentName}"`);
    return result === 'done';
  }
}

export class DisabledRenamer implements SpaceRenamer {
  /**
   * Stands in for the renamer when `renameFromOtherComputers` is false: no rename is done.
   *
   * @returns Always false.
   */
  public rename(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
