import { TabData } from '../../core/TabData.js';

export class ActivityClock {
  /**
   * Tells when a tab was last active: the later of VivArcDi's own stamp, which survives a
   * restart, and Chromium's `lastAccessed`. The time Vivaldi was closed therefore counts.
   *
   * @param tab A tab.
   * @returns Milliseconds since the epoch, or null for a tab VivArcDi never stamped.
   */
  public static lastActiveOf(tab: chrome.tabs.Tab): number | null {
    const stamp = TabData.ownOf(tab).lastActive;
    if (stamp === undefined) {
      return null;
    }
    const accessed = tab.lastAccessed;
    return typeof accessed === 'number' && Number.isFinite(accessed) ? Math.max(stamp, accessed) : stamp;
  }
}
