export interface PayloadSource {
  url(path: string): string;
  json<T>(path: string): Promise<T>;
}

type FetchFunction = (input: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export class ResourceLoader implements PayloadSource {
  #baseUrl: URL;
  #fetch: FetchFunction;

  /**
   * Loads files that ship with VivArcDi, relative to the payload folder.
   *
   * @param baseUrl URL of the payload folder, ending with a slash.
   * @param fetchImpl Fetch implementation, replaceable in tests.
   */
  constructor(baseUrl: string | URL, fetchImpl: FetchFunction = (input) => globalThis.fetch(input)) {
    this.#baseUrl = new URL(baseUrl);
    this.#fetch = fetchImpl;
  }

  /**
   * Resolves a payload-relative path to an absolute URL.
   *
   * @param path Path relative to the payload folder.
   * @returns Absolute URL.
   */
  public url(path: string): string {
    return new URL(path, this.#baseUrl).href;
  }

  /**
   * Fetches and parses a JSON file from the payload folder.
   *
   * @param path Path relative to the payload folder.
   * @returns The parsed JSON value.
   * @throws {Error} When the file cannot be fetched.
   */
  public async json<T>(path: string): Promise<T> {
    const response = await this.#fetch(this.url(path));
    if (!response.ok) {
      throw new Error(`Cannot load ${path}: HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
