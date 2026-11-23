import type { CommandItem, MenuItem } from '../../core/dom/ContextMenu.js';
import type { Logger } from '../../core/support/Logger.js';
import type { ToastKind } from '../../core/dom/Toast.js';
import type { PromptDialog } from './PromptDialog.js';

/** Reads and writes the page a pinned tab or a saved link opens first. */
export interface PinnedPageStore {
  read(id: string): Promise<string | undefined>;
  write(id: string, url: string): Promise<void>;
  tab(id: string): Promise<chrome.tabs.Tab | undefined>;
}

/** What the live tab shows next to the page it keeps, for the disabled state of Replace. */
export interface PinnedPageSnapshot {
  saved?: string | undefined;
  current?: string | undefined;
  open: boolean;
}

export interface PinnedAddressDependencies {
  store: PinnedPageStore;
  dialog: Pick<PromptDialog, 'ask'>;
  /** Shows a short message to the user. */
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

const PROTOCOLS = ['http:', 'https:', 'file:', 'vivaldi:'];
const INVALID_TEXT = 'Enter a valid address';
const FAILED_TEXT = 'Could not change the address';
const DIALOG_TEXT = 'This is what opens first when you click this tab or its favicon.';

export class PinnedAddress {
  #deps: PinnedAddressDependencies;

  /**
   * The `Edit Pinned Page` submenu of a pinned tab or a saved link: it saves the address of the
   * open tab as the address it opens first, or a typed one. The name and icon are never written.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedAddressDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param id The id of a pinned tab or a saved link.
   * @returns `Edit Pinned Page ▸` with `Replace Pinned URL with Current`, disabled when the row has
   * no open tab or the tab already has the saved address, and `Edit…`.
   */
  public async submenu(id: string): Promise<MenuItem> {
    const [tab, saved] = await Promise.all([this.#tab(id), this.#saved(id)]);
    return this.menuFor(id, { saved, current: tab?.url, open: tab !== undefined });
  }

  /**
   * @param id The id of a pinned tab or a saved link.
   * @param snapshot What the tab shows next to its saved page.
   * @returns The same submenu, built synchronously from the snapshot.
   */
  public menuFor(id: string, snapshot: PinnedPageSnapshot): MenuItem {
    const current = snapshot.current;
    const replace: CommandItem = {
      label: 'Replace Pinned URL with Current',
      disabled: !snapshot.open || current === undefined || PinnedAddress.#same(current, snapshot.saved),
      run: (): void => void this.replace(id),
    };
    return { label: 'Edit Pinned Page', items: [replace, { label: 'Edit…', run: (): void => void this.edit(id) }] };
  }

  /**
   * Makes the address the tab shows now the page it opens first.
   *
   * @param id The id of a pinned tab or a saved link.
   */
  public async replace(id: string): Promise<void> {
    const tab = await this.#tab(id);
    if (tab?.url !== undefined) {
      await this.#write(id, tab.url);
    }
  }

  /**
   * Asks for an address and saves it as the page the tab opens first.
   *
   * @param id The id of a pinned tab or a saved link.
   */
  public async edit(id: string): Promise<void> {
    try {
      const value = await this.#deps.dialog.ask({
        title: 'Edit Pinned URL',
        text: DIALOG_TEXT,
        label: 'URL',
        value: (await this.#saved(id)) ?? '',
        confirm: 'Save',
        validate: (text) => (PinnedAddress.#valid(text) ? null : INVALID_TEXT),
      });
      if (value !== null) {
        await this.#write(id, value);
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  async #tab(id: string): Promise<chrome.tabs.Tab | undefined> {
    try {
      return await this.#deps.store.tab(id);
    } catch (error) {
      this.#deps.logger.warn('could not read the pinned address', error);
      return undefined;
    }
  }

  async #write(id: string, url: string): Promise<void> {
    try {
      await this.#deps.store.write(id, url);
    } catch (error) {
      this.#fail(error);
    }
  }

  async #saved(id: string): Promise<string | undefined> {
    try {
      return await this.#deps.store.read(id);
    } catch (error) {
      this.#deps.logger.warn('could not read the pinned address', error);
      return undefined;
    }
  }

  #fail(error: unknown): void {
    this.#deps.logger.warn('could not change the pinned address', error);
    this.#deps.notify(FAILED_TEXT, 'error');
  }

  static #valid(text: string): boolean {
    try {
      return PROTOCOLS.includes(new URL(text).protocol);
    } catch {
      return false;
    }
  }

  static #same(first: string, second: string | undefined): boolean {
    try {
      return second !== undefined && new URL(first).href === new URL(second).href;
    } catch {
      return first === second;
    }
  }
}
