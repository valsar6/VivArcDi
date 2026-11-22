const MAX_DATA_LENGTH = 8192;
const ICON_SELECTOR = 'link[rel~="icon"]';
const SIZE_PATTERN = /(\d+)x\d+/;
function isWeb(address) {
  try {
    const { protocol } = new URL(address);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
function isUsable(address) {
  if (address.startsWith("data:")) return address.length <= MAX_DATA_LENGTH;
  return isWeb(address);
}
function sizeOf(sizes) {
  const match = SIZE_PATTERN.exec(sizes ?? "");
  return match?.[1] === void 0 ? 0 : Number(match[1]);
}
function resolve(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}
class FaviconReader {
  #dependencies;
  constructor(dependencies) {
    this.#dependencies = dependencies;
  }
  /**
   * @param request The address of the link and its open tab, when it has one.
   * @returns The address of the favicon, or null when none could be read; never throws.
   */
  async read(request) {
    try {
      if (!isWeb(request.url)) return null;
      const fromTab = request.tab?.favIconUrl;
      if (fromTab !== void 0 && isUsable(fromTab) && await this.#dependencies.loadImage(fromTab)) return fromTab;
      return await this.#fromPage(request.url);
    } catch (error) {
      this.#dependencies.logger.warn("Could not read the favicon", error);
      return null;
    }
  }
  async #fromPage(url) {
    const candidates = [...await this.#links(url), new URL("/favicon.ico", url).href];
    for (const candidate of candidates) {
      if (isUsable(candidate) && await this.#dependencies.loadImage(candidate)) return candidate;
    }
    return null;
  }
  async #page(url) {
    try {
      const response = await this.#dependencies.fetch(url);
      return response.ok ? await response.text() : null;
    } catch (error) {
      this.#dependencies.logger.warn("Could not fetch the page", error);
      return null;
    }
  }
  async #links(url) {
    const html = await this.#page(url);
    if (html === null) return [];
    const document = this.#dependencies.parser.parseFromString(html, "text/html");
    return Array.from(document.querySelectorAll(ICON_SELECTOR)).map((link) => ({ href: link.getAttribute("href"), size: sizeOf(link.getAttribute("sizes")) })).filter((link) => link.href !== null).sort((first, second) => second.size - first.size).map((link) => resolve(link.href, url)).filter((address) => address !== null);
  }
}
export {
  FaviconReader
};
