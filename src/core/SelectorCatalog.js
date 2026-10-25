export class SelectorCatalog {
  #selectors;
  #version;

  /**
   * Holds the CSS selectors of Vivaldi's interface for one Vivaldi version.
   * Modules ask the catalog for selectors by name instead of hard-coding them,
   * so a Vivaldi update only needs a new selector file.
   *
   * @param {Record<string, string>} selectors Selector strings keyed by name.
   * @param {string | null} version The catalog version, e.g. `8.1`, or null if none matched.
   */
  constructor(selectors, version) {
    this.#selectors = Object.freeze({ ...selectors });
    this.#version = version;
  }

  /**
   * Loads the catalog that best matches a Vivaldi version.
   *
   * @param {import('./ResourceLoader.js').ResourceLoader} loader Payload file loader.
   * @param {string} vivaldiVersion Full Vivaldi version, e.g. `8.1.3740.12`.
   * @returns {Promise<SelectorCatalog>} The matching catalog, or an empty one with a null version.
   */
  static async load(loader, vivaldiVersion) {
    const index = await loader.json('selectors/index.json');
    const match = SelectorCatalog.bestMatch(index.versions, vivaldiVersion);
    if (match === null) {
      return new SelectorCatalog({}, null);
    }
    return new SelectorCatalog(await loader.json(`selectors/${match}.json`), match);
  }

  /**
   * Picks the newest catalog that is not newer than the running Vivaldi.
   * An unknown Vivaldi version gets the newest catalog.
   *
   * @param {string[]} available Catalog versions, e.g. `['8.0', '8.1']`.
   * @param {string} vivaldiVersion Full Vivaldi version, or `unknown`.
   * @returns {string | null} The chosen catalog version, or null when all catalogs are newer.
   */
  static bestMatch(available, vivaldiVersion) {
    const sorted = [...available].sort((a, b) => compareVersions(b, a));
    const target = parseVersion(vivaldiVersion);
    if (target === null) {
      return sorted[0] ?? null;
    }
    return sorted.find((candidate) => compareVersions(candidate, vivaldiVersion) <= 0) ?? null;
  }

  /**
   * @returns {string | null} The catalog version in use.
   */
  get version() {
    return this.#version;
  }

  /**
   * @param {string} name Selector name.
   * @returns {boolean} Whether the catalog defines that selector.
   */
  has(name) {
    return Object.hasOwn(this.#selectors, name);
  }

  /**
   * @param {string} name Selector name, e.g. `browser`.
   * @returns {string} The CSS selector.
   * @throws {Error} When the selector is not defined for this version.
   */
  get(name) {
    if (!this.has(name)) {
      throw new Error(`Selector "${name}" is not defined for Vivaldi ${this.#version}`);
    }
    return this.#selectors[name];
  }
}

function parseVersion(version) {
  const parts = String(version).split('.').slice(0, 2).map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) {
    return null;
  }
  return parts;
}

function compareVersions(left, right) {
  const [leftMajor, leftMinor] = parseVersion(left);
  const [rightMajor, rightMinor] = parseVersion(right);
  return leftMajor - rightMajor || leftMinor - rightMinor;
}
