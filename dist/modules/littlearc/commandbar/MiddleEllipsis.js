const ELLIPSIS = "\u2026";
class MiddleEllipsis {
  /**
   * Shortens a host that is too long by cutting its middle, so that the start and the end stay
   * readable: `membership.example-platform.com` becomes `membersh…platform.com`.
   *
   * @param host The host.
   * @param maxChars The most characters the result may have, the ellipsis included.
   * @returns The host as it is when it fits, else its start, an ellipsis and its end.
   */
  static of(host, maxChars) {
    if (host.length <= maxChars) {
      return host;
    }
    const kept = Math.max(0, maxChars - ELLIPSIS.length);
    const head = Math.floor(kept / 2);
    const tail = kept - head;
    return `${host.slice(0, head)}${ELLIPSIS}${host.slice(host.length - tail)}`;
  }
}
export {
  MiddleEllipsis
};
