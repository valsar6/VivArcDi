const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const LEADING_WWW = /^www\./;

export class AddressDisplay {
  /**
   * The text the address pill shows while it is not being edited.
   *
   * @param address The address of the page in the window, or nothing yet.
   * @returns The host of an `http(s)` page without a leading `www.`, and an empty text for any other
   * address (`about:blank`, the new tab page, invalid text).
   */
  public static of(address: string | null | undefined): string {
    try {
      const url = new URL(address ?? '');
      return WEB_PROTOCOLS.has(url.protocol) ? url.host.replace(LEADING_WWW, '') : '';
    } catch {
      return '';
    }
  }

  /**
   * @param address The address of the page in the window, or nothing yet.
   * @returns Whether it is an `http(s)` page.
   */
  public static isWeb(address: string | null | undefined): boolean {
    return AddressDisplay.of(address) !== '';
  }
}
