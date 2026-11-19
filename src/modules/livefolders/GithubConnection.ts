import type { Logger } from '../../core/support/Logger.js';
import { StoredFormat } from '../../core/browser/StoredFormat.js';
import type { Readout, ReadingStorage } from '../../core/browser/StoredFormat.js';
import type { GithubFetch } from './GithubPullRequests.js';

export const CONNECTION_STORAGE_KEY = 'vivarcdi.liveFolders.github';
export const USER_URL = 'https://api.github.com/user';

export type ConnectionListener = () => void;

export interface ConnectionDependencies {
  storage: ReadingStorage;
  logger: Logger;
  send: GithubFetch;
}

interface Stored {
  token: string;
  login: string;
}

const FORMAT = new StoredFormat<Stored | null>({
  empty: null,
  read: (data): Readout<Stored | null> | null => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null;
    }
    const stored = data as Partial<Stored>;
    const value = typeof stored.token === 'string' && stored.token !== '' ? { token: stored.token, login: typeof stored.login === 'string' ? stored.login : '' } : null;
    return { value, skipped: false };
  },
});

export class GithubConnection {
  #deps: ConnectionDependencies;
  #listeners = new Set<ConnectionListener>();

  /**
   * The connection of the browser profile to GitHub: the token that the device flow returned and
   * the login of its owner, kept in the interface's storage under its own key, apart from the live
   * folders. It is read from the storage each time, so that a connection made in another window
   * is seen too. The token goes only into the `Authorization` header of a `GET` to `api.github.com`
   * and is never logged.
   *
   * @param dependencies The storage, the logger and how to send a request.
   */
  constructor(dependencies: ConnectionDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @returns The token, or null when GitHub is not connected.
   */
  public get token(): string | null {
    return this.#read()?.token ?? null;
  }

  /**
   * @returns The login of the connected user, an empty text when it could not be read, or null when GitHub is not connected.
   */
  public get login(): string | null {
    return this.#read()?.login ?? null;
  }

  /**
   * @returns Whether a token is stored.
   */
  public get connected(): boolean {
    return this.token !== null;
  }

  /**
   * Stores a token, reads the login of its owner from GitHub and tells the listeners. When the
   * login cannot be read the token is kept all the same.
   *
   * @param token The token that GitHub returned.
   * @returns The login of the user, or an empty text when it could not be read.
   */
  public async save(token: string): Promise<string> {
    const login = await this.#loginOf(token);
    this.#write({ token, login });
    this.#notify();
    return login;
  }

  /**
   * Forgets the token and tells the listeners.
   */
  public forget(): void {
    this.#write(null);
    this.#notify();
  }

  /**
   * Forgets the token only when it is the one stored now, in one synchronous step, so that a
   * token saved meanwhile in another window is not erased. When it differs, or none is stored,
   * nothing is written and nobody is told.
   *
   * @param token The token that was used and refused.
   * @returns Whether it was forgotten; false when the stored token differs or there is none.
   */
  public forgetIf(token: string): boolean {
    if (this.token !== token) {
      return false;
    }
    this.forget();
    return true;
  }

  /**
   * @param listener Called after a token was saved or forgotten here.
   * @returns A function that removes the listener.
   */
  public onChange(listener: ConnectionListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async #loginOf(token: string): Promise<string> {
    try {
      const response = await this.#deps.send(USER_URL, {
        method: 'GET',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      });
      const body = (await response.json()) as { login?: unknown };
      return response.ok && typeof body.login === 'string' ? body.login : '';
    } catch {
      this.#deps.logger.warn('could not read the GitHub login of the connection');
      return '';
    }
  }

  #read(): Stored | null {
    return this.#deps.storage.read(CONNECTION_STORAGE_KEY, FORMAT).value;
  }

  #write(stored: Stored | null): void {
    try {
      this.#deps.storage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(stored ?? {}));
    } catch {
      this.#deps.logger.warn('the GitHub connection could not be stored');
    }
  }

  #notify(): void {
    [...this.#listeners].forEach((listener) => listener());
  }
}
