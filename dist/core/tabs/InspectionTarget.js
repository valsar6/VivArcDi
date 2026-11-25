const VIVALDI_SCHEME = "vivaldi:";
const INSPECT_HOST = "inspect";
const DEVTOOLS_SCHEMES = /* @__PURE__ */ new Set(["devtools:", "chrome-devtools:"]);
class InspectionTarget {
  /**
   * @param url The address of a tab, from `url` or `pendingUrl`.
   * @returns Whether the address is Vivaldi's `inspect` page or one of the DevTools windows it
   * opens; false for a missing or malformed address and for every other page.
   */
  static is(url) {
    if (url === void 0) {
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
  static #segmentOf(address) {
    return address.host !== "" ? address.host : address.pathname.split("/")[0] ?? "";
  }
}
export {
  InspectionTarget
};
