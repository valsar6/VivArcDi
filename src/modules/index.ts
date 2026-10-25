import { ModuleRegistry } from '../core/ModuleRegistry.js';
import { ActivationMarker } from './ActivationMarker.js';
import { FavoritesGrid } from './favorites/FavoritesGrid.js';

/**
 * Builds the registry of every module that ships with VivArcDi.
 * New modules are added here.
 *
 * @returns A registry with all built-in modules.
 */
export function createDefaultRegistry(): ModuleRegistry {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid);
}
