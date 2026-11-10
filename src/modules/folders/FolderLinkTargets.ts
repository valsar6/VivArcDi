import type { LinkDropTarget, LinkPage, LinkTargets } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import type { DropPlace } from './DropPlace.js';
import type { DropTarget, DropTargets } from './DropTargets.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface FolderLinkTargetsDependencies {
  targets: Pick<DropTargets, 'at' | 'mark' | 'clear'>;
  place: Pick<DropPlace, 'of'>;
  favorites: Pick<WorkspaceFavorites, 'add' | 'addLink'>;
  logger: Logger;
}

export class FolderLinkTargets implements LinkTargets {
  #deps: FolderLinkTargetsDependencies;

  /**
   * The folders, the gaps between their rows and the space header, offered to the other modules
   * as the places where a dragged page becomes a link of the workspace.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FolderLinkTargetsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null.
   */
  public at(x: number, y: number): LinkDropTarget | null {
    return this.#deps.targets.at(x, y);
  }

  /**
   * @param target The place to mark, or null to unmark.
   */
  public mark(target: LinkDropTarget | null): void {
    this.#deps.targets.mark(target as DropTarget | null);
  }

  /**
   * Removes the mark.
   */
  public clear(): void {
    this.#deps.targets.clear();
  }

  /**
   * @param target A place given by `at`.
   * @param page The tab or the title and address to add.
   * @returns Whether a link was added.
   */
  public async drop(target: LinkDropTarget, page: LinkPage): Promise<boolean> {
    const place = this.#deps.place.of(target as DropTarget);
    try {
      const result = 'tab' in page ? await this.#deps.favorites.add(page.tab, place) : await this.#deps.favorites.addLink(page, place);
      return result === 'added';
    } catch (error) {
      this.#deps.logger.warn('could not add the dragged page', error);
      return false;
    }
  }
}
