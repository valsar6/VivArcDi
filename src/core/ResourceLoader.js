export class ResourceLoader {
  #baseUrl;
  #fetch;

  /**
   * Loads files that ship with VivArcDi, relative to the payload folder.
   *
   * @param {string | URL} baseUrl URL of the payload folder, ending with a slash.
   * @param {typeof fetch} [fetchImpl] Fetch implementation, replaceable in tests.
   */
  constructor(baseUrl, fetchImpl = (...args) => globalThis.fetch(...args)) {
    this.#baseUrl = new URL(baseUrl);
    this.#fetch = fetchImpl;
  }

  /**
   * Resolves a payload-relative path to an absolute URL.
   *
   * @param {string} path Path relative to the payload folder.
   * @returns {string} Absolute URL.
   */
  url(path) {
    return new URL(path, this.#baseUrl).href;
  }

  /**
   * Fetches and parses a JSON file from the payload folder.
   *
   * @param {string} path Path relative to the payload folder.
   * @returns {Promise<any>} The parsed JSON value.
   * @throws {Error} When the file cannot be fetched.
   */
  async json(path) {
    const response = await this.#fetch(this.url(path));
    if (!response.ok) {
      throw new Error(`Cannot load ${path}: HTTP ${response.status}`);
    }
    return response.json();
  }
}
