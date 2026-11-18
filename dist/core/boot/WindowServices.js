import { Notices, NOTICE_MS } from "../dom/Notices.js";
import { Toast } from "../dom/Toast.js";
import { GuardedStorage } from "./GuardedStorage.js";
import { NoticedStorage } from "./NoticedStorage.js";
class WindowServices {
  /**
   * Builds the services every module of a window shares: the one toast under the browser element
   * and the storage that tells the user when it cannot save. Announces a storage that works in
   * memory only.
   *
   * @param document The browser window document.
   * @param selectors Selectors for the running Vivaldi.
   * @param storage The storage that does the work.
   * @param logger The window logger; the storage logs under its own child.
   * @returns The notices and the storage given to modules.
   */
  static open(document, selectors, storage, logger) {
    const parent = document.querySelector(selectors.get("browser")) ?? document.body;
    const notices = new Notices(new Toast({ document, parent, durationMs: NOTICE_MS }));
    const noticed = new NoticedStorage(storage, notices);
    noticed.announce();
    return { storage: new GuardedStorage(noticed, notices, logger.child("storage")), notices };
  }
}
export {
  WindowServices
};
