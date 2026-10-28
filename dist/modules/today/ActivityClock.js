import { TabData } from "../../core/TabData.js";
class ActivityClock {
  /**
   * Tells when a tab was last active: the later of VivArcDi's own stamp, which survives a
   * restart, and Chromium's `lastAccessed`. The time Vivaldi was closed therefore counts.
   *
   * @param tab A tab.
   * @returns Milliseconds since the epoch, or null for a tab VivArcDi never stamped.
   */
  static lastActiveOf(tab) {
    const stamp = TabData.ownOf(tab).lastActive;
    if (stamp === void 0) {
      return null;
    }
    const accessed = tab.lastAccessed;
    return typeof accessed === "number" && Number.isFinite(accessed) ? Math.max(stamp, accessed) : stamp;
  }
}
export {
  ActivityClock
};
