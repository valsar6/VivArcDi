class ResourceLoader {
  #baseUrl;
  #fetch;
  /**
   * Loads files that ship with VivArcDi, relative to the payload folder.
   *
   * @param baseUrl URL of the payload folder, ending with a slash.
   * @param fetchImpl Fetch implementation, replaceable in tests.
   */
  constructor(baseUrl, fetchImpl = (input) => globalThis.fetch(input)) {
    this.#baseUrl = new URL(baseUrl);
    this.#fetch = fetchImpl;
  }
  /**
   * Resolves a payload-relative path to an absolute URL.
   *
   * @param path Path relative to the payload folder.
   * @returns Absolute URL.
   */
  url(path) {
    return new URL(path, this.#baseUrl).href;
  }
  /**
   * Fetches and parses a JSON file from the payload folder.
   *
   * @param path Path relative to the payload folder.
   * @returns The parsed JSON value.
   * @throws {Error} When the file cannot be fetched.
   */
  async json(path) {
    return await (await this.#get(path)).json();
  }
  /**
   * Fetches a text file from the payload folder, such as a script to inject into pages.
   *
   * @param path Path relative to the payload folder.
   * @returns The file contents.
   * @throws {Error} When the file cannot be fetched.
   */
  async text(path) {
    return (await this.#get(path)).text();
  }
  async #get(path) {
    const response = await this.#fetch(this.url(path));
    if (!response.ok) {
      throw new Error(`Cannot load ${path}: HTTP ${response.status}`);
    }
    return response;
  }
}
export {
  ResourceLoader
};
