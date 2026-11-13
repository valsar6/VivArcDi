const WEB_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;
class AddressKey {
  /**
   * Turns a web address into the key used to match it with a pinned tab:
   * the host without `www.`, then the path without trailing `/`.
   * The scheme, the query string and the fragment are ignored.
   *
   * @param url An address, possibly missing or malformed.
   * @returns The key, or null when the address is not an `http` or `https` URL.
   */
  static from(url) {
    const parsed = AddressKey.#parse(url);
    if (parsed === null || !WEB_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    const host = parsed.host.replace(LEADING_WWW, "");
    return `${host}${parsed.pathname.replace(TRAILING_SLASHES, "")}`;
  }
  static #parse(url) {
    try {
      return url === void 0 ? null : new URL(url);
    } catch {
      return null;
    }
  }
}
export {
  AddressKey
};
