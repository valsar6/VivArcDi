const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;

export class AddressKey {
  /**
   * Turns a web address into the key used to match it with a pinned tab:
   * the host without `www.`, then the path without trailing `/`.
   * The scheme, the query string and the fragment are ignored.
   *
   * @param url An address, possibly missing or malformed.
   * @returns The key, or null when the address is not an `http` or `https` URL.
   */
  public static from(url: string | undefined): string | null {
    const parsed = AddressKey.#parse(url);
    if (parsed === null || !WEB_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    const host = parsed.host.replace(LEADING_WWW, '');
    return `${host}${parsed.pathname.replace(TRAILING_SLASHES, '')}`;
  }

  static #parse(url: string | undefined): URL | null {
    try {
      return url === undefined ? null : new URL(url);
    } catch {
      return null;
    }
  }
}
