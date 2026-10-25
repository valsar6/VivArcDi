export class StyleInjector {
  #document;
  #loader;
  #links = [];

  /**
   * Adds VivArcDi stylesheets to Vivaldi's interface.
   *
   * @param {Document} document The document of Vivaldi's browser window.
   * @param {import('./ResourceLoader.js').ResourceLoader} loader Resolves stylesheet paths.
   */
  constructor(document, loader) {
    this.#document = document;
    this.#loader = loader;
  }

  /**
   * Appends a `<link rel="stylesheet">` for a payload stylesheet.
   *
   * @param {string} path Stylesheet path relative to the payload folder.
   * @returns {HTMLLinkElement} The added link element.
   */
  inject(path) {
    const link = this.#document.createElement('link');
    link.rel = 'stylesheet';
    link.href = this.#loader.url(path);
    link.dataset.vivarcdi = path;
    this.#document.head.append(link);
    this.#links.push(link);
    return link;
  }

  /**
   * Removes every stylesheet this injector added.
   */
  removeAll() {
    this.#links.forEach((link) => link.remove());
    this.#links = [];
  }
}
