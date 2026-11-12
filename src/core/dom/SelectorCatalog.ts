import type { PayloadSource } from './ResourceLoader.js';
import type { SelectorIndex } from './types.js';

type VersionPair = [number, number];

export class SelectorCatalog {
  #selectors: Readonly<Record<string, string>>;
  #version: string | null;

  /**
   * Holds the CSS selectors of Vivaldi's interface for one Vivaldi version.
   * Modules ask the catalog for selectors by name instead of hard-coding them,
   * so a Vivaldi update only needs a new selector file.
   *
   * @param selectors Selector strings keyed by name.
   * @param version The catalog version, e.g. `8.1`, or null if none matched.
   */
  constructor(selectors: Record<string, string>, version: string | null) {
    this.#selectors = Object.freeze({ ...selectors });
    this.#version = version;
  }

  /**
   * Loads the catalog that best matches a Vivaldi version.
   *
   * @param loader Payload file loader.
   * @param vivaldiVersion Full Vivaldi version, e.g. `8.1.3740.12`.
   * @returns The matching catalog, or an empty one with a null version.
   */
  public static async load(loader: PayloadSource, vivaldiVersion: string): Promise<SelectorCatalog> {
    const index = await loader.json<SelectorIndex>('selectors/index.json');
    const match = SelectorCatalog.bestMatch(index.versions, vivaldiVersion);
    if (match === null) {
      return new SelectorCatalog({}, null);
    }
    return new SelectorCatalog(await loader.json<Record<string, string>>(`selectors/${match}.json`), match);
  }

  /**
   * Picks the newest catalog that is not newer than the running Vivaldi.
   * An unknown Vivaldi version gets the newest catalog.
   *
   * @param available Catalog versions, e.g. `['8.0', '8.1']`.
   * @param vivaldiVersion Full Vivaldi version, or `unknown`.
   * @returns The chosen catalog version, or null when all catalogs are newer.
   */
  public static bestMatch(available: string[], vivaldiVersion: string): string | null {
    const sorted = [...available].sort((a, b) => compareVersions(b, a));
    if (parseVersion(vivaldiVersion) === null) {
      return sorted[0] ?? null;
    }
    return sorted.find((candidate) => compareVersions(candidate, vivaldiVersion) <= 0) ?? null;
  }

  /**
   * @returns The catalog version in use.
   */
  public get version(): string | null {
    return this.#version;
  }

  /**
   * @param name Selector name.
   * @returns Whether the catalog defines that selector.
   */
  public has(name: string): boolean {
    return Object.hasOwn(this.#selectors, name);
  }

  /**
   * @param name Selector name.
   * @returns The CSS selector.
   * @throws {Error} When the catalog does not define it.
   */
  public get(name: string): string {
    const selector = this.#selectors[name];
    if (selector === undefined || !this.has(name)) {
      throw new Error(`Selector "${name}" is not defined for Vivaldi ${this.#version}`);
    }
    return selector;
  }
}

function parseVersion(version: string): VersionPair | null {
  const [major, minor] = String(version).split('.').slice(0, 2).map(Number);
  if (major === undefined || minor === undefined || Number.isNaN(major) || Number.isNaN(minor)) {
    return null;
  }
  return [major, minor];
}

function compareVersions(left: string, right: string): number {
  const leftPair = parseVersion(left);
  const rightPair = parseVersion(right);
  if (leftPair === null || rightPair === null) {
    throw new Error(`Invalid version: ${leftPair === null ? left : right}`);
  }
  return leftPair[0] - rightPair[0] || leftPair[1] - rightPair[1];
}
