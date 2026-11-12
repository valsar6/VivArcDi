import type { PayloadSource } from '../../core/ResourceLoader.js';

export const TOKEN_PATH = 'secrets/github-token';

export class GithubToken {
  #payload: Pick<PayloadSource, 'text'>;

  /**
   * The GitHub token that `vivarcdi live-folders token` stored with the payload. It is read for
   * each refresh, so that a token added while Vivaldi runs is used at the next one. It is never
   * kept: not in a field, not in browser storage, not in a log.
   *
   * @param payload The files that ship with VivArcDi.
   */
  constructor(payload: Pick<PayloadSource, 'text'>) {
    this.#payload = payload;
  }

  /**
   * @returns The token, or null when none is stored.
   */
  public async read(): Promise<string | null> {
    try {
      const token = (await this.#payload.text(TOKEN_PATH)).trim();
      return token === '' ? null : token;
    } catch {
      return null;
    }
  }
}
