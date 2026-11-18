import type { SavingStorage } from '../browser/SavingStorage.js';
import { Notices, NOTICE_MS } from '../dom/Notices.js';
import type { SelectorCatalog } from '../dom/SelectorCatalog.js';
import { Toast } from '../dom/Toast.js';
import { NoticedStorage } from './NoticedStorage.js';
import type { ModuleSettings } from './ModuleSettings.js';
import type { BuildInfo } from './types.js';

export interface StartServices {
  settings: ModuleSettings;
  selectors: SelectorCatalog;
  build: BuildInfo;
  storage: NoticedStorage;
  notices: Notices;
}

export class WindowServices {
  /**
   * Builds the services every module of a window shares: the one toast under the browser element
   * and the storage that tells the user when it cannot save. Announces a storage that works in
   * memory only.
   *
   * @param document The browser window document.
   * @param selectors Selectors for the running Vivaldi.
   * @param storage The storage that does the work.
   * @returns The notices and the storage given to modules.
   */
  public static open(document: Document, selectors: SelectorCatalog, storage: SavingStorage): Pick<StartServices, 'storage' | 'notices'> {
    const parent = document.querySelector(selectors.get('browser')) ?? document.body;
    const notices = new Notices(new Toast({ document, parent, durationMs: NOTICE_MS }));
    const noticed = new NoticedStorage(storage, notices);
    noticed.announce();
    return { storage: noticed, notices };
  }
}
