import { BrowserSearch } from '../../core/BrowserSearch.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { AddressResolver } from './AddressResolver.js';

export const BAR_ATTRIBUTE = 'data-vivarcdi-little-arc';
export const BAR_CLASS = 'vivarcdi-little-arc-bar';

export type BarTabs = Pick<BrowserTabs, 'update' | 'reload' | 'goBack' | 'onUpdated'>;

export interface BarOptions {
  document: Document;
  host: HTMLElement;
  tabs: BarTabs;
  search: Pick<BrowserSearch, 'run'>;
  tabId: number;
  onKeep: () => void;
  logger: Logger;
}

export class LittleArcBar {
  #options: BarOptions;
  #root: HTMLElement | null = null;
  #field: HTMLInputElement | null = null;
  #unsubscribe: (() => void) | null = null;

  /**
   * The compact bar of a Little Arc window: back, reload, the address field and the button that
   * keeps the page. Vivaldi's popup window has no address field of its own.
   *
   * @param options The window, its tab and what the bar calls.
   */
  constructor(options: BarOptions) {
    this.#options = options;
  }

  /**
   * Draws the bar at the top of the window and puts the cursor in the address field.
   */
  public mount(): void {
    const { document, host, tabs, tabId } = this.#options;
    const root = document.createElement('div');
    root.className = BAR_CLASS;
    const field = document.createElement('input');
    field.type = 'text';
    field.placeholder = 'Search or enter address';
    field.setAttribute('aria-label', 'Search or type an address');
    field.addEventListener('keydown', (event) => this.#submitOnEnter(event));
    root.append(
      this.#button('Back', '‹', () => void this.#run(() => tabs.goBack(tabId))),
      this.#button('Reload', '↻', () => void this.#run(() => tabs.reload(tabId))),
      field,
      this.#button('Move to workspace', 'Move to workspace', () => this.#options.onKeep()),
    );
    host.setAttribute(BAR_ATTRIBUTE, '');
    host.prepend(root);
    this.#root = root;
    this.#field = field;
    this.#unsubscribe = tabs.onUpdated((id, change) => this.#follow(id, change));
    field.focus();
  }

  /**
   * Removes the bar.
   */
  public unmount(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root?.remove();
    this.#options.host.removeAttribute(BAR_ATTRIBUTE);
    this.#root = null;
    this.#field = null;
  }

  /**
   * @returns Whether the address field has no text.
   */
  public get isEmpty(): boolean {
    return (this.#field?.value ?? '') === '';
  }

  /**
   * Empties the address field.
   */
  public clear(): void {
    if (this.#field !== null) {
      this.#field.value = '';
    }
  }

  #button(label: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = this.#options.document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
  }

  #submitOnEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    const resolved = AddressResolver.resolve(this.#field?.value ?? '');
    if (resolved === null) {
      return;
    }
    event.preventDefault();
    const { tabs, tabId, search } = this.#options;
    if (resolved.kind === 'url') {
      void this.#run(() => tabs.update(tabId, { url: resolved.url }));
    } else {
      void this.#run(() => search.run(resolved.text, tabId)).then((done) => {
        if (!done) {
          void this.#run(() => tabs.update(tabId, { url: BrowserSearch.fallbackAddress(resolved.text) }));
        }
      });
    }
  }

  #follow(tabId: number, change: chrome.tabs.OnUpdatedInfo): void {
    if (tabId === this.#options.tabId && change.url !== undefined && this.#field !== null && this.#field !== this.#options.document.activeElement) {
      this.#field.value = change.url;
    }
  }

  async #run(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action();
      return true;
    } catch (error) {
      this.#options.logger.warn('Little Arc bar action failed', error);
      return false;
    }
  }
}
