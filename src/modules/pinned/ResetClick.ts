import { TabSlot } from '../../core/TabSlot.js';

export interface ResetClickDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of the favicon of a tab row. */
  faviconSelector: string;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  /** Whether a tab left its own page. */
  isAway: (tabId: number) => boolean;
  /** Brings a tab back to its own page. */
  reset: (tabId: number) => void;
}

export class ResetClick {
  #deps: ResetClickDependencies;
  #listener = (event: Event): void => this.#handle(event);

  /**
   * Turns the favicon of an away pinned row into a reset button, as in Arc.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: ResetClickDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening, in the capture phase so Vivaldi does not see the click first.
   */
  public attach(): void {
    this.#deps.document.addEventListener('click', this.#listener, true);
  }

  /**
   * Stops listening.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('click', this.#listener, true);
  }

  #handle(event: Event): void {
    const favicon = (event.target as Element | null)?.closest?.(this.#deps.faviconSelector) ?? null;
    const tabId = favicon === null ? null : TabSlot.idOf(favicon, this.#deps.wrapperSelector);
    if (tabId === null || !this.#deps.isAway(tabId)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#deps.reset(tabId);
  }
}
