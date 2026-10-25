import { DomQuery } from '../core/DomQuery.js';
import { Module } from '../core/Module.js';
import type { ModuleContext } from '../core/Module.js';

export class ActivationMarker extends Module {
  public static override id = 'activation-marker';

  #element: HTMLElement | null = null;

  /**
   * Marks Vivaldi's root element with the `vivarcdi-active` class and the
   * VivArcDi version, so stylesheets only apply when VivArcDi is running.
   *
   * @param context What the module may use.
   */
  public override start({ document, selectors, build }: ModuleContext): void {
    const element = DomQuery.require(document, selectors.get('browser'));
    element.classList.add('vivarcdi-active');
    element.dataset['vivarcdiVersion'] = build.vivarcdiVersion;
    this.#element = element;
  }

  /**
   * Removes the class and the version attribute.
   */
  public override stop(): void {
    this.#element?.classList.remove('vivarcdi-active');
    delete this.#element?.dataset['vivarcdiVersion'];
    this.#element = null;
  }
}
