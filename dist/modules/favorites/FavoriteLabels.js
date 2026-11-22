class FavoriteLabels {
  /**
   * Gives a Favorite the name and icon the user chose: the name replaces the title, and the icon
   * and the favicon are added. A Favorite with no label key, or with no label, stays as it is.
   *
   * @param favorite A Favorite, with its label key when it can have a label.
   * @param labels Where the labels are kept.
   * @returns The Favorite to draw.
   */
  static apply(favorite, labels) {
    const label = favorite.labelKey === void 0 ? void 0 : labels.get(favorite.labelKey);
    if (label === void 0) {
      return favorite;
    }
    return {
      ...favorite,
      title: label.name ?? favorite.title,
      ...label.icon === void 0 ? {} : { icon: label.icon },
      ...label.favicon === void 0 ? {} : { favicon: label.favicon }
    };
  }
}
export {
  FavoriteLabels
};
