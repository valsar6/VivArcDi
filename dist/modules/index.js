import { ModuleRegistry } from "../core/ModuleRegistry.js";
import { ActivationMarker } from "./ActivationMarker.js";
import { FavoritesGrid } from "./favorites/FavoritesGrid.js";
import { Peek } from "./peek/Peek.js";
import { ReopenPinned } from "./reopen/ReopenPinned.js";
function createDefaultRegistry() {
  return new ModuleRegistry().register(ActivationMarker).register(FavoritesGrid).register(Peek).register(ReopenPinned);
}
export {
  createDefaultRegistry
};
