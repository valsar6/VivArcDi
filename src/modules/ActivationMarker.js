import { Module } from '../core/Module.js';

export class ActivationMarker extends Module {
  static id = 'activation-marker';

  #element = null;

  /**
   * Marks Vivaldi's root element with the `vivarcdi-active` class and the
   * VivArcDi version, so stylesheets only apply when VivArcDi is running.
   *
   * @param {import('../core/Module.js').ModuleContext} context
   */
  start({ document, selectors, build }) {
    this.#element = document.querySelector(selectors.get('browser'));
    this.#element.classList.add('vivarcdi-active');
    this.#element.dataset.vivarcdiVersion = build.vivarcdiVersion;
  }

  /**
   * Removes the class and the version attribute.
   */
  stop() {
    this.#element?.classList.remove('vivarcdi-active');
    delete this.#element?.dataset.vivarcdiVersion;
    this.#element = null;
  }
}
