import { ModuleRegistry } from "../core/ModuleRegistry.js";
import { ActivationMarker } from "./ActivationMarker.js";
import { BookmarkFolders } from "./folders/BookmarkFolders.js";
import { FavoritesGrid } from "./favorites/FavoritesGrid.js";
import { FolderPreview } from "./folderpreview/FolderPreview.js";
import { Peek } from "./peek/Peek.js";
import { PinnedTabs } from "./pinned/PinnedTabs.js";
import { ReopenPinned } from "./reopen/ReopenPinned.js";
function createDefaultRegistry() {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid).register(Peek).register(PinnedTabs).register(ReopenPinned).register(BookmarkFolders).register(FolderPreview);
}
export {
  createDefaultRegistry
};
