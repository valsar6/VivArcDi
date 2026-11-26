import type { ModuleContext } from '../../core/boot/Module.js';
import type { ShapeProbe } from '../../core/boot/ShapeGuards.js';
import type { SelectorCatalog } from '../../core/dom/SelectorCatalog.js';

export const REACT_PROBE = 'react-fiber';

const FIBER_KEY = '__reactFiber';

export class ReactProbe implements ShapeProbe {
  public readonly name = REACT_PROBE;
  public readonly expects = 'a React fiber on the browser element or its children';
  #document: Document;
  #selectors: Pick<SelectorCatalog, 'get'>;

  /**
   * The cheap check at boot that Vivaldi's interface is still built with React: the browser element
   * or one of its direct children carries a fiber key. It reads no storage and starts no timer.
   *
   * @param document The browser window document.
   * @param selectors Selectors for the running Vivaldi.
   */
  constructor(document: Document, selectors: Pick<SelectorCatalog, 'get'>) {
    this.#document = document;
    this.#selectors = selectors;
  }

  /**
   * @returns True when the browser element or a direct child has a fiber key; false otherwise, also
   * when the lookup throws.
   */
  public holds(): boolean {
    try {
      const element = this.#document.querySelector(this.#selectors.get('browser'));
      return element !== null && [element, ...Array.from(element.children)].some(ReactProbe.#hasFiber);
    } catch {
      return false;
    }
  }

  static #hasFiber(element: Element): boolean {
    return Object.keys(element).some((key) => key.startsWith(FIBER_KEY));
  }
}

/**
 * Registers the React probe so that the start runs it once, however many modules register it.
 *
 * @param context The context of the module that uses React's internals.
 */
export function registerReactProbe(context: Pick<ModuleContext, 'document' | 'selectors' | 'shape'>): void {
  context.shape.add(new ReactProbe(context.document, context.selectors));
}
