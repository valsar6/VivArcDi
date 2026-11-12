import { PullRequestFilters } from './PullRequestFilters.js';
import type { PullRequestFilterValues } from './PullRequestFilters.js';

export interface PullRequestRow {
  /** GitHub's id of the pull request, unique among all of them. */
  id: string;
  title: string;
  /** The address of the pull request on GitHub. */
  url: string;
  /** The author and the repository, `author · owner/repo`. */
  subtitle: string;
  /** When the pull request last changed, as GitHub reports it. */
  updatedAt: string;
}

export interface GithubResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

/** The part of `fetch` that GitHub's API needs: only `GET`, which is all VivArcDi sends with the token. Replaceable in tests, so that no test reaches the network. */
export type GithubFetch = (url: string, init: { method: 'GET'; headers: Record<string, string> }) => Promise<GithubResponse>;

export interface SearchItem {
  id: number;
  title: string;
  html_url: string;
  updated_at: string;
  user: { login: string };
  repository_url: string;
}

export const SEARCH_URL = 'https://api.github.com/search/issues';
export const UNREACHABLE_REASON = 'GitHub cannot be reached';
export const REFUSED_REASON = 'GitHub refused the connection';
export const RATE_LIMIT_REASON = "GitHub's rate limit, retrying later";

const PAGE_SIZE = 50;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_MANY_REQUESTS = 429;
const REPOSITORY_PATH = /\/repos\/(.+)$/;
const SUBTITLE_SEPARATOR = ' · ';

export class GithubFailure extends Error {
  /** Whether GitHub answered 401: the connection was revoked or is no longer valid. */
  public readonly refused: boolean;

  /**
   * Why a request to GitHub failed, in words for the folder's warning mark. It never holds the
   * token or any header.
   *
   * @param reason The short reason to show.
   * @param refused Whether GitHub refused the token.
   */
  constructor(reason: string, refused = false) {
    super(reason);
    this.name = 'GithubFailure';
    this.refused = refused;
  }
}

export class GithubPullRequests {
  #fetch: GithubFetch;

  /**
   * Asks GitHub's search for the open pull requests that match the filters of a live folder and
   * maps the answer to rows. A pull request that closed or merged is not in the answer, so it
   * leaves the folder at the next refresh.
   *
   * @param fetchImpl How to send a request.
   */
  constructor(fetchImpl: GithubFetch) {
    this.#fetch = fetchImpl;
  }

  /**
   * Runs one search for each enabled list and merges the answers: a pull request found by both
   * appears once, and the newest update comes first. With both lists off nothing is sent.
   *
   * @param filters The filters of the folder.
   * @param token A GitHub token with read access to pull requests.
   * @returns The rows, newest update first.
   * @throws {GithubFailure} When GitHub cannot be reached or refuses a request.
   */
  public async list(filters: PullRequestFilterValues, token: string): Promise<PullRequestRow[]> {
    const answers = await Promise.all(PullRequestFilters.queries(filters).map((query) => this.#search(query, token)));
    const rows = new Map(answers.flat().map((row) => [row.id, row]));
    return [...rows.values()].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  }

  /**
   * @param item One result of GitHub's search.
   * @returns The row that shows it: the title, and under it the author and the repository.
   */
  public static toRow(item: SearchItem): PullRequestRow {
    const repository = REPOSITORY_PATH.exec(item.repository_url)?.[1] ?? item.repository_url;
    return {
      id: String(item.id),
      title: item.title,
      url: item.html_url,
      subtitle: `${item.user.login}${SUBTITLE_SEPARATOR}${repository}`,
      updatedAt: item.updated_at,
    };
  }

  async #search(query: string, token: string): Promise<PullRequestRow[]> {
    const url = `${SEARCH_URL}?${new URLSearchParams({ q: query, sort: 'updated', order: 'desc', per_page: String(PAGE_SIZE) })}`;
    const response = await this.#send(url, token);
    if (!response.ok) {
      throw new GithubFailure(GithubPullRequests.#reasonOf(response.status), response.status === UNAUTHORIZED);
    }
    const body = (await response.json()) as { items?: SearchItem[] };
    return (body.items ?? []).map((item) => GithubPullRequests.toRow(item));
  }

  async #send(url: string, token: string): Promise<GithubResponse> {
    try {
      return await this.#fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      });
    } catch {
      throw new GithubFailure(UNREACHABLE_REASON);
    }
  }

  static #reasonOf(status: number): string {
    if (status === UNAUTHORIZED) {
      return REFUSED_REASON;
    }
    return status === FORBIDDEN || status === TOO_MANY_REQUESTS ? RATE_LIMIT_REASON : `GitHub answered ${status}`;
  }
}
