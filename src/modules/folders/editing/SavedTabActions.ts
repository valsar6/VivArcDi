import type { MenuItem } from '../../../core/dom/ContextMenu.js';
import type { ToastKind } from '../../../core/dom/Toast.js';
import type { ModuleContext } from '../../../core/boot/Module.js';
import { LabelKeys, LinkLabels } from '../../../core/browser/LinkLabels.js';
import { TextCopier } from '../../../shared/clipboard/TextCopier.js';
import { BookmarkCopier } from '../../../shared/linkmenu/BookmarkCopier.js';
import { LinkClipboard } from '../../../shared/linkmenu/LinkClipboard.js';
import { LinkDuplication } from '../../../shared/linkmenu/LinkDuplication.js';
import { LinkExtras } from '../../../shared/linkmenu/LinkExtras.js';
import { LinkedTab } from '../../../shared/linkmenu/LinkedTab.js';
import { LabelCommands } from '../../../shared/links/LabelCommands.js';
import type { EditTarget } from '../../../shared/links/InPlaceEditor.js';
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
  #labelCommands: LabelCommands | null = null;

  /**
   * The items of the menu of a saved tab that Arc has besides Remove pin and Tile tab: Copy Link,
   * Change Icon, Rename, Edit Pinned Page, Open in Split View, Duplicate and Move to. Each one
   * builds its collaborators the first time the menu asks for it.
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
   * @returns The seven actions the menu of a saved tab is built from.
   */
  public create(toast: Notify): Omit<LinkActions, 'removePin' | 'tileTab'> {
    const labels = this.#labelCommandsFor(toast);
    return {
      copyLink: (linkId): MenuItem | null => this.#copyLink(linkId, toast),
      changeIcon: (linkId): MenuItem | null => labels.items(linkId)[0] ?? null,
      rename: (linkId): MenuItem | null => labels.items(linkId)[1] ?? null,
      editPinnedPage: (linkId): Promise<MenuItem | null> => this.#editPinnedPage(linkId, toast),
      openInSplitView: (linkId): Promise<MenuItem | null> => this.#openInSplitView(linkId, toast),
      duplicate: (linkId): MenuItem | null => this.#duplicate(linkId, toast),
      moveTo: (linkId): MenuItem | null => this.#moveTo(linkId),
    };
  }

  #labelCommandsFor(toast: Notify): LabelCommands {
    this.#labelCommands ??= LabelCommands.of(this.#context, {
      keyOf: (linkId): string => LabelKeys.bookmark(linkId),
      target: (linkId): EditTarget | null => this.#rowTarget(linkId),
      textOf: (linkId): string => this.#rowTarget(linkId)?.anchor.textContent ?? '',
      pageOf: (linkId): Promise<{ url: string; tab?: chrome.tabs.Tab } | null> => this.#pageOf(linkId),
      notify: toast,
    });
    return this.#labelCommands;
  }

  #rowTarget(linkId: string): EditTarget | null {
    const { document } = this.#context;
    const anchor = document.querySelector<HTMLElement>(`[data-vivarcdi-link-id="${linkId}"] .vivarcdi-folders-title`);
    return anchor === null ? null : { anchor, covers: true };
  }

  async #pageOf(linkId: string): Promise<{ url: string; tab?: chrome.tabs.Tab } | null> {
    try {
      const { url } = await this.#context.bookmarkWriter.get(linkId);
      if (url === undefined) {
        return null;
      }
      const tab = await new LinkedTab(this.#context.tabs).of(linkId);
      return tab === undefined ? { url } : { url, tab };
    } catch (error) {
      this.#context.logger.warn('could not read the page of the link', error);
      return null;
    }
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
    const { bookmarkWriter, storage, logger } = this.#context;
    const extras = new LinkExtras(LinkLabels.of(storage, logger));
    const duplication = new LinkDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), extras, notify, logger });
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
