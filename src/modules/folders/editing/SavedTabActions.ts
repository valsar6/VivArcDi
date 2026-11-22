import type { MenuItem } from '../../../core/dom/ContextMenu.js';
import type { ToastKind } from '../../../core/dom/Toast.js';
import type { ModuleContext } from '../../../core/boot/Module.js';
import { TextCopier } from '../../../shared/clipboard/TextCopier.js';
import { BookmarkCopier } from '../../../shared/linkmenu/BookmarkCopier.js';
import { LinkClipboard } from '../../../shared/linkmenu/LinkClipboard.js';
import { LinkDuplication } from '../../../shared/linkmenu/LinkDuplication.js';
import { LinkExtras } from '../../../shared/linkmenu/LinkExtras.js';
import { LinkedTab } from '../../../shared/linkmenu/LinkedTab.js';
import { LinkRelocationFactory } from './LinkRelocationFactory.js';
import type { LinkRelocation } from './LinkRelocation.js';
import type { LinkActions } from './LinkMenuItems.js';
import { PinnedAddress } from '../../../shared/linkmenu/PinnedAddress.js';
import { PromptDialog } from '../../../shared/linkmenu/PromptDialog.js';
import { SplitView } from '../../../shared/linkmenu/SplitView.js';
import type { EditingSources } from './FolderEditing.js';

type Notify = (text: string, kind?: ToastKind) => void;

export class SavedTabActions {
  #context: ModuleContext;
  #sources: EditingSources;
  #stops: Array<() => void> = [];
  #pinned: PinnedAddress | null = null;
  #split: SplitView | undefined;
  #relocation: LinkRelocation | null = null;

  /**
   * The items of the menu of a saved tab that Arc has besides Remove pin and Tile tab: Copy Link,
   * Edit Pinned Page, Open in Split View, Duplicate and Move to. Each one builds its collaborators
   * the first time the menu asks for it.
   *
   * @param context What the module may use.
   * @param sources What it reads from the section.
   */
  constructor(context: ModuleContext, sources: EditingSources) {
    this.#context = context;
    this.#sources = sources;
  }

  /**
   * @param toast Shows a message to the user.
   * @returns The five actions the menu of a saved tab is built from.
   */
  public create(toast: Notify): Omit<LinkActions, 'removePin' | 'tileTab'> {
    return {
      copyLink: (linkId): MenuItem | null => this.#copyLink(linkId, toast),
      editPinnedPage: (linkId): Promise<MenuItem | null> => this.#editPinnedPage(linkId, toast),
      openInSplitView: (linkId): Promise<MenuItem | null> => this.#openInSplitView(linkId, toast),
      duplicate: (linkId): MenuItem | null => this.#duplicate(linkId, toast),
      moveTo: (linkId): MenuItem | null => this.#moveTo(linkId),
    };
  }

  #copyLink(linkId: string, notify: Notify): MenuItem {
    const { document, bookmarkWriter, logger } = this.#context;
    const clipboard = new LinkClipboard({ writer: bookmarkWriter, copier: TextCopier.for(document, document.defaultView?.navigator.clipboard), notify, logger });
    return { label: 'Copy Link', run: (): void => void clipboard.copy(linkId) };
  }

  async #editPinnedPage(linkId: string, notify: Notify): Promise<MenuItem | null> {
    const { document, selectors, tabs, bookmarkWriter, logger } = this.#context;
    this.#pinned ??= new PinnedAddress({
      writer: bookmarkWriter,
      linkedTab: new LinkedTab(tabs),
      dialog: new PromptDialog({ document, parent: (): Element => document.querySelector(selectors.get('browser')) ?? document.body }),
      notify,
      logger,
    });
    return this.#pinned.submenu(linkId);
  }

  #openInSplitView(linkId: string, notify: Notify): Promise<MenuItem | null> {
    return this.#splitView(notify).item(linkId);
  }

  #splitView(notify: Notify): SplitView {
    if (this.#split === undefined) {
      const split = SplitView.of(this.#context, notify);
      this.#stops.push(() => {
        split.stop();
        this.#split = undefined;
      });
      this.#split = split;
    }
    return this.#split;
  }

  #duplicate(linkId: string, notify: Notify): MenuItem {
    const { bookmarkWriter, logger } = this.#context;
    const duplication = new LinkDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), extras: new LinkExtras(), notify, logger });
    return { label: 'Duplicate', run: (): void => void duplication.duplicate(linkId) };
  }

  #moveTo(linkId: string): MenuItem | null {
    if (this.#relocation === null) {
      const relocation = LinkRelocationFactory.create({ context: this.#context, sources: this.#sources });
      if (relocation === null) {
        return null;
      }
      this.#relocation = relocation;
      this.#stops.push(() => {
        relocation.dispose();
        this.#relocation = null;
      });
    }
    return this.#relocation.submenu(linkId);
  }

  /**
   * Stops what the actions started.
   */
  public stop(): void {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
}
