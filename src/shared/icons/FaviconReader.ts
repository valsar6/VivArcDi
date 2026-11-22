import type { Logger } from '../../core/support/Logger.js';

export interface FaviconRequest {
  url: string;
  tab?: chrome.tabs.Tab;
}

export interface PageParser {
  parseFromString(html: string, type: DOMParserSupportedType): { querySelectorAll(selector: string): ArrayLike<{ getAttribute(name: string): string | null }> };
}

export interface FaviconReaderDependencies {
  /** Fetches a page from the UI window. */
  fetch: (url: string) => Promise<{ ok: boolean; text(): Promise<string> }>;
  /** Tells whether an image loads from the address. */
  loadImage: (url: string) => Promise<boolean>;
  parser: PageParser;
  logger: Logger;
}

const MAX_DATA_LENGTH = 8192;
const ICON_SELECTOR = 'link[rel~="icon"]';
const SIZE_PATTERN = /(\d+)x\d+/;

function isWeb(address: string): boolean {
  try {
    const { protocol } = new URL(address);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function isUsable(address: string): boolean {
  if (address.startsWith('data:')) return address.length <= MAX_DATA_LENGTH;
  return isWeb(address);
}

function sizeOf(sizes: string | null): number {
  const match = SIZE_PATTERN.exec(sizes ?? '');
  return match?.[1] === undefined ? 0 : Number(match[1]);
}

function resolve(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/** Reads the current favicon of a site: the open tab first, then its page, then `/favicon.ico`. */
export class FaviconReader {
  #dependencies: FaviconReaderDependencies;

  constructor(dependencies: FaviconReaderDependencies) {
    this.#dependencies = dependencies;
  }

  /**
   * @param request The address of the link and its open tab, when it has one.
   * @returns The address of the favicon, or null when none could be read; never throws.
   */
  public async read(request: FaviconRequest): Promise<string | null> {
    try {
      if (!isWeb(request.url)) return null;
      const fromTab = request.tab?.favIconUrl;
      if (fromTab !== undefined && isUsable(fromTab) && (await this.#dependencies.loadImage(fromTab))) return fromTab;
      return await this.#fromPage(request.url);
    } catch (error) {
      this.#dependencies.logger.warn('Could not read the favicon', error);
      return null;
    }
  }

  async #fromPage(url: string): Promise<string | null> {
    const candidates = [...(await this.#links(url)), new URL('/favicon.ico', url).href];
    for (const candidate of candidates) {
      if (isUsable(candidate) && (await this.#dependencies.loadImage(candidate))) return candidate;
    }
    return null;
  }

  async #page(url: string): Promise<string | null> {
    try {
      const response = await this.#dependencies.fetch(url);
      return response.ok ? await response.text() : null;
    } catch (error) {
      this.#dependencies.logger.warn('Could not fetch the page', error);
      return null;
    }
  }

  async #links(url: string): Promise<string[]> {
    const html = await this.#page(url);
    if (html === null) return [];
    const document = this.#dependencies.parser.parseFromString(html, 'text/html');
    return Array.from(document.querySelectorAll(ICON_SELECTOR))
      .map((link) => ({ href: link.getAttribute('href'), size: sizeOf(link.getAttribute('sizes')) }))
      .filter((link): link is { href: string; size: number } => link.href !== null)
      .sort((first, second) => second.size - first.size)
      .map((link) => resolve(link.href, url))
      .filter((address): address is string => address !== null);
  }
}
