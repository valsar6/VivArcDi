import { PullRequestFilters } from "./PullRequestFilters.js";
const SEARCH_URL = "https://api.github.com/search/issues";
const UNREACHABLE_REASON = "GitHub cannot be reached";
const REFUSED_REASON = "The token was refused";
const RATE_LIMIT_REASON = "GitHub's rate limit, retrying later";
const PAGE_SIZE = 50;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_MANY_REQUESTS = 429;
const REPOSITORY_PATH = /\/repos\/(.+)$/;
const SUBTITLE_SEPARATOR = " \xB7 ";
class GithubFailure extends Error {
  /**
   * Why a request to GitHub failed, in words for the folder's warning mark. It never holds the
   * token or any header.
   *
   * @param reason The short reason to show.
   */
  constructor(reason) {
    super(reason);
    this.name = "GithubFailure";
  }
}
class GithubPullRequests {
  #fetch;
  /**
   * Asks GitHub's search for the open pull requests that match the filters of a live folder and
   * maps the answer to rows. A pull request that closed or merged is not in the answer, so it
   * leaves the folder at the next refresh.
   *
   * @param fetchImpl How to send a request.
   */
  constructor(fetchImpl) {
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
  async list(filters, token) {
    const answers = await Promise.all(PullRequestFilters.queries(filters).map((query) => this.#search(query, token)));
    const rows = new Map(answers.flat().map((row) => [row.id, row]));
    return [...rows.values()].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  }
  /**
   * @param item One result of GitHub's search.
   * @returns The row that shows it: the title, and under it the author and the repository.
   */
  static toRow(item) {
    const repository = REPOSITORY_PATH.exec(item.repository_url)?.[1] ?? item.repository_url;
    return {
      id: String(item.id),
      title: item.title,
      url: item.html_url,
      subtitle: `${item.user.login}${SUBTITLE_SEPARATOR}${repository}`,
      updatedAt: item.updated_at
    };
  }
  async #search(query, token) {
    const url = `${SEARCH_URL}?${new URLSearchParams({ q: query, sort: "updated", order: "desc", per_page: String(PAGE_SIZE) })}`;
    const response = await this.#send(url, token);
    if (!response.ok) {
      throw new GithubFailure(GithubPullRequests.#reasonOf(response.status));
    }
    const body = await response.json();
    return (body.items ?? []).map((item) => GithubPullRequests.toRow(item));
  }
  async #send(url, token) {
    try {
      return await this.#fetch(url, {
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" }
      });
    } catch {
      throw new GithubFailure(UNREACHABLE_REASON);
    }
  }
  static #reasonOf(status) {
    if (status === UNAUTHORIZED) {
      return REFUSED_REASON;
    }
    return status === FORBIDDEN || status === TOO_MANY_REQUESTS ? RATE_LIMIT_REASON : `GitHub answered ${status}`;
  }
}
export {
  GithubFailure,
  GithubPullRequests,
  RATE_LIMIT_REASON,
  REFUSED_REASON,
  SEARCH_URL,
  UNREACHABLE_REASON
};
