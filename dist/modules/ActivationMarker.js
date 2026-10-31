import { DomQuery } from "../core/DomQuery.js";
import { Module } from "../core/Module.js";
class ActivationMarker extends Module {
  static id = "activation-marker";
  static privateWindows = "allowed";
  #element = null;
  /**
   * Marks Vivaldi's root element with the `data-vivarcdi-active` attribute and the
   * VivArcDi version, so stylesheets only apply when VivArcDi is running.
   * The mark is a data attribute because Vivaldi rewrites the root's classes on every re-render.
   *
   * @param context What the module may use.
   */
  start({ document, selectors, build }) {
    const element = DomQuery.require(document, selectors.get("browser"));
    element.dataset["vivarcdiActive"] = "";
    element.dataset["vivarcdiVersion"] = build.vivarcdiVersion;
    this.#element = element;
  }
  /**
   * Removes the activation and version attributes.
   */
  stop() {
    delete this.#element?.dataset["vivarcdiActive"];
    delete this.#element?.dataset["vivarcdiVersion"];
    this.#element = null;
  }
}
export {
  ActivationMarker
};
