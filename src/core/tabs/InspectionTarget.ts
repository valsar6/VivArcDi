const VIVALDI_SCHEME = 'vivaldi:';
const INSPECT_HOST = 'inspect';
const DEVTOOLS_SCHEMES = new Set(['devtools:', 'chrome-devtools:']);

/**
 * Tells the internal pages Vivaldi opens to inspect itself, which must not change the workspace
 * the sidebar shows, from a normal page that belongs to no workspace.
 */
export class InspectionTarget {
  /**
   * @param url The address of a tab, from `url` or `pendingUrl`.
   * @returns Whether the address is Vivaldi's `inspect` page or one of the DevTools windows it
   * opens; false for a missing or malformed address and for every other page.
   */
  public static is(url: string | undefined): boolean {
    if (url === undefined) {
      return false;
    }
    try {
      const address = new URL(url);
      if (DEVTOOLS_SCHEMES.has(address.protocol)) {
        return true;
      }
      return address.protocol === VIVALDI_SCHEME && InspectionTarget.#segmentOf(address) === INSPECT_HOST;
    } catch {
      return false;
    }
  }

  static #segmentOf(address: URL): string {
    return address.host !== '' ? address.host : (address.pathname.split('/')[0] ?? '');
  }
}
