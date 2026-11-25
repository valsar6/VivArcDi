import type { BookmarkNode } from '../../../core/browser/bookmarks/BookmarkNode.js';
import type { SubmenuItem } from '../../../core/dom/ContextMenu.js';
import type { ModuleContext } from '../../../core/boot/Module.js';
import { TabDataWriter } from '../../../core/tabs/TabDataWriter.js';
import type { ToastKind } from '../../../core/dom/Toast.js';
import { BookmarkCopier } from '../../../shared/linkmenu/BookmarkCopier.js';
import { BookmarkTrash } from './BookmarkTrash.js';
import { FolderDeletion } from './FolderDeletion.js';
import { FolderDuplication } from './FolderDuplication.js';
import { FolderLinkTabs } from './FolderLinkTabs.js';
import { FolderRelocation } from './FolderRelocation.js';
import type { FolderActions } from './FolderMenuItems.js';
import type { EditingSources } from './FolderEditing.js';
import type { FolderSectionView } from '../view/FolderSectionView.js';

export interface FolderActionsDependencies {
  context: ModuleContext;
  view: Pick<FolderSectionView, 'edit'>;
  sources: EditingSources;
  notify: (text: string, kind?: ToastKind) => void;
}

export class FolderActionsFactory {
  /**
   * Builds what the items of the folder menu do: rename, Duplicate, Move to and Delete.
   *
   * @param dependencies What the actions collaborate with.
   * @returns The actions.
   */
  public static create({ context, view, sources, notify }: FolderActionsDependencies): FolderActions {
    const { tabs, bookmarkWriter, logger } = context;
    const linkTabs = new FolderLinkTabs({ tabs });
    const duplication = new FolderDuplication({ writer: bookmarkWriter, copier: new BookmarkCopier(bookmarkWriter), notify, logger });
    const relocation = new FolderRelocation({
      writer: bookmarkWriter,
      linkTabs,
      tabData: TabDataWriter.of(tabs),
      names: sources.names,
      active: sources.active,
      roots: sources.roots,
      openFolders: sources.openFolders,
      closing: sources.closing,
      notify,
      logger,
    });
    const deletion = new FolderDeletion({
      writer: bookmarkWriter,
      linkTabs,
      trash: new BookmarkTrash({ tree: (): Promise<BookmarkNode[]> => bookmarkWriter.tree() }),
      tabs,
      openFolders: sources.openFolders,
      active: sources.active,
      closing: sources.closing,
      redraw: sources.redraw,
      notify,
      logger,
    });
    return {
      rename: (folderId): void => view.edit(folderId),
      duplicate: (folderId): void => void duplication.duplicate(folderId),
      moveTo: (folderId): SubmenuItem | null => relocation.submenu(folderId),
      remove: (folderId): void => void deletion.delete(folderId),
    };
  }
}
