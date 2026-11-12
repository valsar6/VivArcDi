const BASE_QUERY = "is:pr is:open";
const MINE_QUALIFIER = "author:@me";
const REVIEW_QUALIFIER = "review-requested:@me";
const REPOSITORY_NAME = /^[\w.-]+\/[\w.-]+$/;
const LINE_BREAKS = /\r?\n/;
class PullRequestFilters {
  /**
   * @returns The filters of a new live folder: both lists and the drafts on, every repository.
   */
  static defaults() {
    return { createdByMe: true, reviewRequests: true, drafts: true, repositories: [] };
  }
  /**
   * Reads filters that were stored, tolerating anything: a missing or wrong field takes its default.
   *
   * @param value What was stored.
   * @returns Valid filters.
   */
  static from(value) {
    const stored = typeof value === "object" && value !== null ? value : {};
    const defaults = PullRequestFilters.defaults();
    const flag = (name) => typeof stored[name] === "boolean" ? stored[name] : defaults[name];
    const repositories = stored["repositories"];
    return {
      createdByMe: flag("createdByMe"),
      reviewRequests: flag("reviewRequests"),
      drafts: flag("drafts"),
      repositories: Array.isArray(repositories) ? PullRequestFilters.#repositoriesIn(repositories.filter((name) => typeof name === "string")) : []
    };
  }
  /**
   * One GitHub search per enabled list. Drafts off adds `draft:false`, and each repository adds a
   * `repo:` qualifier, which GitHub joins with OR.
   *
   * @param filters The filters of a folder.
   * @returns The search queries; none when both lists are off.
   */
  static queries(filters) {
    const lists = [filters.createdByMe ? MINE_QUALIFIER : null, filters.reviewRequests ? REVIEW_QUALIFIER : null];
    const narrowing = [filters.drafts ? null : "draft:false", ...filters.repositories.map((name) => `repo:${name}`)];
    return lists.flatMap((list) => list === null ? [] : [[BASE_QUERY, list, ...narrowing.filter((part) => part !== null)].join(" ")]);
  }
  /**
   * @param filters The filters of a folder.
   * @param name The filter to flip.
   * @returns The filters with that one flipped.
   */
  static toggled(filters, name) {
    return { ...filters, [name]: !filters[name] };
  }
  /**
   * @param text Lines typed by the user, one `owner/repo` each.
   * @returns The valid names, each once, in order; other lines are dropped.
   */
  static parseRepositories(text) {
    return PullRequestFilters.#repositoriesIn(text.split(LINE_BREAKS));
  }
  /**
   * @param repositories The repository names of a folder.
   * @returns The text to edit, one name per line.
   */
  static formatRepositories(repositories) {
    return repositories.join("\n");
  }
  static #repositoriesIn(lines) {
    return [...new Set(lines.map((line) => line.trim()).filter((line) => REPOSITORY_NAME.test(line)))];
  }
}
export {
  PullRequestFilters
};
