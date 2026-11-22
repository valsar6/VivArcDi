import type { LinkedTabs } from './LinkedTabs.js';

export class TileTab {
  #links: Pick<LinkedTabs, 'snapshot'>;

  /**
   * Finds the open tab of a tile: the tab linked to its bookmark in the active workspace.
   *
   * @param links Knows which tabs are linked to which Favorite.
   */
  constructor(links: Pick<LinkedTabs, 'snapshot'>) {
    this.#links = links;
  }

  /**
   * @param linkId The bookmark id of the tile.
   * @returns Its tab in the active workspace, or undefined when it has none.
   */
  public async of(linkId: string): Promise<chrome.tabs.Tab | undefined> {
    return (await this.#links.snapshot()).linked.get(linkId);
  }
}
