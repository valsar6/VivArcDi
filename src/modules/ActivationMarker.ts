import { DomQuery } from '../core/DomQuery.js';
import { Module } from '../core/Module.js';
import type { ModuleContext, PrivateWindowPolicy } from '../core/Module.js';

export class ActivationMarker extends Module {
  public static override id = 'activation-marker';
  public static override privateWindows: PrivateWindowPolicy = 'allowed';

  #element: HTMLElement | null = null;

  /**
   * Marks Vivaldi's root element with the `data-vivarcdi-active` attribute and the
   * VivArcDi version, so stylesheets only apply when VivArcDi is running.
   * The mark is a data attribute because Vivaldi rewrites the root's classes on every re-render.
   *
   * @param context What the module may use.
   */
  public override start({ document, selectors, build }: ModuleContext): void {
    const element = DomQuery.require(document, selectors.get('browser'));
    element.dataset['vivarcdiActive'] = '';
    element.dataset['vivarcdiVersion'] = build.vivarcdiVersion;
    this.#element = element;
  }

  /**
   * Removes the activation and version attributes.
   */
  public override stop(): void {
    delete this.#element?.dataset['vivarcdiActive'];
    delete this.#element?.dataset['vivarcdiVersion'];
    this.#element = null;
  }
}
