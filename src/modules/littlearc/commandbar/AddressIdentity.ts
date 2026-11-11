const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;
const WEB_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * @param url An address.
 * @returns Whether it is an `http` or `https` address.
 */
export function isWebAddress(url: string): boolean {
  try {
    return WEB_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Turns an address into what two rows must share to be the same page: the host without `www.`, the
 * path without trailing slashes and the query. The scheme and the fragment are ignored.
 *
 * @param url An address.
 * @returns The identity of the page.
 */
export function identityOf(url: string): string {
  const parsed = new URL(url);
  return `${parsed.host.replace(LEADING_WWW, '')}${parsed.pathname.replace(TRAILING_SLASHES, '')}${parsed.search}`;
}
