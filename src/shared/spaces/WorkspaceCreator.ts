import { MenuCommand } from './MenuCommand.js';
import type { MenuParts, MenuResult } from './MenuCommand.js';

export class WorkspaceCreator extends MenuCommand {
  /**
   * Creates a workspace through Vivaldi's own menu, because no API creates one: opens the menu,
   * presses "New workspace", writes the name, presses save and waits until Vivaldi lists the name.
   * The icon is not set; the workspace has Vivaldi's default one.
   *
   * @param parts Everything the command collaborates with.
   */
  constructor(parts: MenuParts) {
    super(parts);
  }

  /**
   * @param name The name of the workspace to create.
   * @returns `done` when Vivaldi lists it, `deferred` when it is not a quiet moment, `failed` when a step failed.
   */
  public create(name: string): Promise<MenuResult> {
    const { menu } = this.parts;
    return this.attempt(async () => {
      await menu.open();
      await menu.startCreate();
      await menu.writeName(name);
      await menu.save();
      await this.listed(name);
    }, `creating "${name}"`);
  }
}
