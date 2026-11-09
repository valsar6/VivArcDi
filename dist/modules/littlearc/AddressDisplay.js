const WEB_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
const LEADING_WWW = /^www\./;
class AddressDisplay {
  /**
   * The text the address pill shows while it is not being edited.
   *
   * @param address The address of the page in the window, or nothing yet.
   * @returns The host of an `http(s)` page without a leading `www.`, and an empty text for any other
   * address (`about:blank`, the new tab page, invalid text).
   */
  static of(address) {
    try {
      const url = new URL(address ?? "");
      return WEB_PROTOCOLS.has(url.protocol) ? url.host.replace(LEADING_WWW, "") : "";
    } catch {
      return "";
    }
  }
  /**
   * @param address The address of the page in the window, or nothing yet.
   * @returns Whether it is an `http(s)` page.
   */
  static isWeb(address) {
    return AddressDisplay.of(address) !== "";
  }
}
export {
  AddressDisplay
};
