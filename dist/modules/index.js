import { ModuleRegistry } from "../core/boot/ModuleRegistry.js";
import { ActivationMarker } from "./ActivationMarker.js";
import { CopyUrl } from "./copyurl/CopyUrl.js";
import { BookmarkFolders } from "./folders/BookmarkFolders.js";
import { FavoritesGrid } from "./favorites/FavoritesGrid.js";
import { FolderPreview } from "./folderpreview/FolderPreview.js";
import { Incognito } from "./incognito/Incognito.js";
import { LittleArc } from "./littlearc/LittleArc.js";
import { LiveFolders } from "./livefolders/LiveFolders.js";
import { Peek } from "./peek/Peek.js";
import { PinnedTabs } from "./pinned/PinnedTabs.js";
import { ReopenPinned } from "./reopen/ReopenPinned.js";
import { SidebarLook } from "./sidebarlook/SidebarLook.js";
import { SpaceHeader } from "./spaceheader/SpaceHeader.js";
import { TodayArchive } from "./today/TodayArchive.js";
import { WorkspaceSync } from "./workspacesync/WorkspaceSync.js";
function createDefaultRegistry() {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid).register(Peek).register(PinnedTabs).register(ReopenPinned).register(BookmarkFolders).register(LiveFolders).register(FolderPreview).register(TodayArchive).register(CopyUrl).register(SpaceHeader).register(Incognito).register(LittleArc).register(SidebarLook).register(WorkspaceSync);
}
export {
  createDefaultRegistry
};
