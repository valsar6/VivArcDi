import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { ClipboardApiCopy, SelectionCopy, TextCopier } from '../../shared/clipboard/TextCopier.js';
import type { ClipboardWriter, CopyStrategy } from '../../shared/clipboard/TextCopier.js';

export class UrlCopier {
  #tabs: Pick<BrowserTabs, 'query'>;
  #copier: TextCopier;

  /**
   * Copies the address of the active tab, trying each way to copy in turn until one works.
   *
   * @param tabs Reads the active tab.
   * @param strategies Ways to copy, the preferred first.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>, strategies: readonly CopyStrategy[]) {
    this.#tabs = tabs;
    this.#copier = new TextCopier(strategies);
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
    await this.#copier.write(url);
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
}
