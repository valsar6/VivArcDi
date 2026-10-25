import { ModuleRegistry } from "../core/ModuleRegistry.js";
import { ActivationMarker } from "./ActivationMarker.js";
import { FavoritesGrid } from "./favorites/FavoritesGrid.js";
import { Peek } from "./peek/Peek.js";
function createDefaultRegistry() {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid).register(Peek);
}
export {
  createDefaultRegistry
};
