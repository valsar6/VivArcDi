import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { CommandItem, MenuItem } from '../../core/dom/ContextMenu.js';
import type { Logger } from '../../core/support/Logger.js';
import type { ToastKind } from '../../core/dom/Toast.js';
import type { LinkedTab } from './LinkedTab.js';
import type { PromptDialog } from './PromptDialog.js';

export interface PinnedAddressDependencies {
  writer: Pick<BookmarkWriter, 'get' | 'setUrl'>;
  linkedTab: Pick<LinkedTab, 'of'>;
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
   * The `Edit Pinned Page` submenu of a saved link: it saves the address of the open tab as the
   * address the link opens first, or a typed one. The name and icon are never written.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PinnedAddressDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param linkId The bookmark id of the link row.
   * @returns `Edit Pinned Page ▸` with `Replace Pinned URL with Current`, disabled when the row has
   * no open tab or the tab already has the saved address, and `Edit…`.
   */
  public async submenu(linkId: string): Promise<MenuItem> {
    const [tab, saved] = await Promise.all([this.#deps.linkedTab.of(linkId), this.#savedUrl(linkId)]);
    const current = tab?.url;
    const replace: CommandItem = {
      label: 'Replace Pinned URL with Current',
      disabled: current === undefined || PinnedAddress.#same(current, saved),
      run: () => void this.#write(linkId, current),
    };
    return { label: 'Edit Pinned Page', items: [replace, { label: 'Edit…', run: () => void this.#edit(linkId) }] };
  }

  async #edit(linkId: string): Promise<void> {
    try {
      const value = await this.#deps.dialog.ask({
        title: 'Edit Pinned URL',
        text: DIALOG_TEXT,
        label: 'URL',
        value: (await this.#savedUrl(linkId)) ?? '',
        confirm: 'Save',
        validate: (text) => (PinnedAddress.#valid(text) ? null : INVALID_TEXT),
      });
      if (value !== null) {
        await this.#write(linkId, value);
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  async #write(linkId: string, url: string | undefined): Promise<void> {
    if (url === undefined) {
      return;
    }
    try {
      await this.#deps.writer.setUrl(linkId, url);
    } catch (error) {
      this.#fail(error);
    }
  }

  async #savedUrl(linkId: string): Promise<string | undefined> {
    try {
      return (await this.#deps.writer.get(linkId)).url;
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
