import type { BrowserTabs } from '../../core/BrowserTabs.js';

export interface CopyStrategy {
  /**
   * Puts a text on the clipboard.
   *
   * @param text The text to copy.
   * @returns Resolves once copied, rejects when the copy was refused.
   */
  write(text: string): Promise<void>;
}

export type ClipboardWriter = Pick<Clipboard, 'writeText'>;

export class ClipboardApiCopy implements CopyStrategy {
  #clipboard: ClipboardWriter | undefined;

  /**
   * Copies with `navigator.clipboard.writeText`.
   *
   * @param clipboard The interface's clipboard, or undefined where it does not exist.
   */
  constructor(clipboard: ClipboardWriter | undefined) {
    this.#clipboard = clipboard;
  }

  /**
   * @param text The text to copy.
   * @returns Resolves once copied, rejects when the clipboard is missing or refuses.
   */
  public async write(text: string): Promise<void> {
    if (this.#clipboard === undefined) {
      throw new Error('navigator.clipboard is not available');
    }
    await this.#clipboard.writeText(text);
  }
}

export class SelectionCopy implements CopyStrategy {
  #document: Document;

  /**
   * Copies by selecting the text in a hidden field and running `document.execCommand('copy')`.
   * The focus goes back to the element that had it.
   *
   * @param document The document of Vivaldi's browser window.
   */
  constructor(document: Document) {
    this.#document = document;
  }

  /**
   * @param text The text to copy.
   * @returns Resolves once copied, rejects when the command is refused.
   */
  public write(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.#copy(text);
      resolve();
    });
  }

  #copy(text: string): void {
    const previous = this.#document.activeElement as HTMLElement | null;
    const field = this.#hiddenField(text);
    this.#document.body.append(field);
    field.select();
    try {
      if (!this.#document.execCommand('copy')) {
        throw new Error('document.execCommand refused to copy');
      }
    } finally {
      field.remove();
      previous?.focus?.();
    }
  }

  #hiddenField(text: string): HTMLTextAreaElement {
    const field = this.#document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-hidden', 'true');
    field.style.setProperty('position', 'fixed');
    field.style.setProperty('opacity', '0');
    field.style.setProperty('pointer-events', 'none');
    return field;
  }
}

export class UrlCopier {
  #tabs: Pick<BrowserTabs, 'query'>;
  #strategies: readonly CopyStrategy[];

  /**
   * Copies the address of the active tab, trying each way to copy in turn until one works.
   *
   * @param tabs Reads the active tab.
   * @param strategies Ways to copy, the preferred first.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>, strategies: readonly CopyStrategy[]) {
    this.#tabs = tabs;
    this.#strategies = strategies;
  }

  /**
   * @param tabs Reads the active tab.
   * @param document The document of Vivaldi's browser window.
   * @param clipboard The interface's clipboard, or undefined where it does not exist.
   * @returns A copier that uses the clipboard and falls back to `execCommand('copy')`.
   */
  public static for(tabs: Pick<BrowserTabs, 'query'>, document: Document, clipboard: ClipboardWriter | undefined): UrlCopier {
    return new UrlCopier(tabs, [new ClipboardApiCopy(clipboard), new SelectionCopy(document)]);
  }

  /**
   * @returns The copied address. Rejects when the active tab has no address or every way to copy
   * was refused.
   */
  public async copyActive(): Promise<string> {
    const url = await this.#activeUrl();
    await this.#write(url);
    return url;
  }

  async #activeUrl(): Promise<string> {
    const [tab] = await this.#tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || tab?.pendingUrl;
    if (!url) {
      throw new Error('The active tab has no address');
    }
    return url;
  }

  async #write(text: string): Promise<void> {
    const refusals: unknown[] = [];
    for (const strategy of this.#strategies) {
      try {
        await strategy.write(text);
        return;
      } catch (error) {
        refusals.push(error);
      }
    }
    throw new AggregateError(refusals, 'Every way to copy was refused');
  }
}
