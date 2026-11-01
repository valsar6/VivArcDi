import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import type { DropTarget } from './DropTargets.js';
import type { AddPlace, WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface TabDropDependencies {
  tabs: Pick<BrowserTabs, 'get'>;
  favorites: Pick<WorkspaceFavorites, 'add'>;
  /** Index among the children of the root of the bookmark before which a tab is dropped; undefined puts it at the end. */
  indexBefore: (bookmarkId: string | null) => number | undefined;
  logger: Logger;
}

export class TabDrops {
  #deps: TabDropDependencies;

  /**
   * Turns a tab of today's list released over a target into a link: in a folder at its end, in the
   * root at the position of the drop, or at the end of the root for the header. A tab that is a
   * link, a Favorite, pinned or not a web page is ignored by `WorkspaceFavorites`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: TabDropDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param tabId The tab that was released.
   * @param target What was under the pointer, or null for nothing.
   */
  public async drop(tabId: number, target: DropTarget | null): Promise<void> {
    if (target === null) {
      return;
    }
    try {
      await this.#deps.favorites.add(await this.#deps.tabs.get(tabId), this.#placeOf(target));
    } catch (error) {
      this.#deps.logger.warn('could not add the dropped tab', error);
    }
  }

  #placeOf(target: DropTarget): AddPlace {
    if (target.kind === 'folder') {
      return { parentId: target.id };
    }
    return target.kind === 'between' ? { index: this.#deps.indexBefore(target.before) } : {};
  }
}
