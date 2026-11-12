import { MenuCommand } from "./MenuCommand.js";
class WorkspaceRenamer extends MenuCommand {
  /**
   * Renames a workspace through the inline editor of Vivaldi's menu: opens the menu, opens the
   * editor of the workspace row, writes the new name and presses save. It is a class of its own
   * behind `SpaceRenamer`, so that the way of opening the editor can change or the renaming be
   * switched off (`renameFromOtherComputers`) without touching the rest.
   *
   * @param parts Everything the command collaborates with.
   */
  constructor(parts) {
    super(parts);
  }
  async rename(currentName, newName) {
    const { menu } = this.parts;
    const result = await this.attempt(async () => {
      await menu.open();
      await menu.startRename(currentName);
      await menu.writeName(newName);
      await menu.save();
      await this.listed(newName);
    }, `renaming "${currentName}"`);
    return result === "done";
  }
}
class DisabledRenamer {
  /**
   * Stands in for the renamer when `renameFromOtherComputers` is false: no rename is done.
   *
   * @returns Always false.
   */
  rename() {
    return Promise.resolve(false);
  }
}
export {
  DisabledRenamer,
  WorkspaceRenamer
};
