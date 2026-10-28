import { ModuleRegistry } from '../core/ModuleRegistry.js';
import { ActivationMarker } from './ActivationMarker.js';
import { CopyUrl } from './copyurl/CopyUrl.js';
import { BookmarkFolders } from './folders/BookmarkFolders.js';
import { FavoritesGrid } from './favorites/FavoritesGrid.js';
import { FolderPreview } from './folderpreview/FolderPreview.js';
import { Peek } from './peek/Peek.js';
import { PinnedTabs } from './pinned/PinnedTabs.js';
import { ReopenPinned } from './reopen/ReopenPinned.js';
import { TodayArchive } from './today/TodayArchive.js';

/**
 * Builds the registry of every module that ships with VivArcDi.
 * New modules are added here.
 *
 * @returns A registry with all built-in modules.
 */
export function createDefaultRegistry(): ModuleRegistry {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid).register(Peek).register(PinnedTabs).register(ReopenPinned).register(BookmarkFolders).register(FolderPreview).register(TodayArchive).register(CopyUrl);
}
