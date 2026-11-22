import type { LinkLabels } from '../../core/browser/LinkLabels.js';
import type { Favorite } from './FavoritesFolder.js';

export type FavoriteLabelStore = Pick<LinkLabels, 'get' | 'onChange'>;

export class FavoriteLabels {
  /**
   * Gives a Favorite the name and icon the user chose: the name replaces the title, and the icon
   * and the favicon are added. A Favorite with no label key, or with no label, stays as it is.
   *
   * @param favorite A Favorite, with its label key when it can have a label.
   * @param labels Where the labels are kept.
   * @returns The Favorite to draw.
   */
  public static apply(favorite: Favorite, labels: Pick<LinkLabels, 'get'>): Favorite {
    const label = favorite.labelKey === undefined ? undefined : labels.get(favorite.labelKey);
    if (label === undefined) {
      return favorite;
    }
    return {
      ...favorite,
      title: label.name ?? favorite.title,
      ...(label.icon === undefined ? {} : { icon: label.icon }),
      ...(label.favicon === undefined ? {} : { favicon: label.favicon }),
    };
  }
}
