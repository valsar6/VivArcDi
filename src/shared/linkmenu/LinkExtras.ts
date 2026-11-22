import { LabelKeys } from '../../core/browser/LinkLabels.js';
import type { LinkLabels } from '../../core/browser/LinkLabels.js';

export class LinkExtras {
  #labels: Pick<LinkLabels, 'copy'>;

  /**
   * What a saved link carries besides its title and address: its name and icon, kept with the
   * label of the bookmark.
   *
   * @param labels Where the labels are kept.
   */
  constructor(labels: Pick<LinkLabels, 'copy'>) {
    this.#labels = labels;
  }

  /**
   * Gives the copy the whole label of the original link.
   *
   * @param fromId The bookmark id of the original link.
   * @param toId The bookmark id of its copy.
   */
  public copy(fromId: string, toId: string): Promise<void> {
    return this.#labels.copy(LabelKeys.bookmark(fromId), LabelKeys.bookmark(toId));
  }
}
