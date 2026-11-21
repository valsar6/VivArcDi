import { TabDataWriter } from "../../../core/tabs/TabDataWriter.js";
import { BookmarkCopier } from "./BookmarkCopier.js";
import { BookmarkTrash } from "./BookmarkTrash.js";
import { FolderDeletion } from "./FolderDeletion.js";
import { FolderDuplication } from "./FolderDuplication.js";
import { FolderLinkTabs } from "./FolderLinkTabs.js";
import { FolderRelocation } from "./FolderRelocation.js";
class FolderActionsFactory {
  /**
   * Builds what the items of the folder menu do: rename, Duplicate, Move to and Delete.
   *
   * @param dependencies What the actions collaborate with.
   * @returns The actions.
   */
  static create({ context, view, sources, notify }) {
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
      logger
    });
    const deletion = new FolderDeletion({
      writer: bookmarkWriter,
      linkTabs,
      trash: new BookmarkTrash({ tree: () => bookmarkWriter.tree() }),
      tabs,
      openFolders: sources.openFolders,
      closing: sources.closing,
      redraw: sources.redraw,
      notify,
      logger
    });
    return {
      rename: (folderId) => view.edit(folderId),
      duplicate: (folderId) => void duplication.duplicate(folderId),
      moveTo: (folderId) => relocation.submenu(folderId),
      remove: (folderId) => void deletion.delete(folderId)
    };
  }
}
export {
  FolderActionsFactory
};
