export interface PullRequestFilterValues {
  /** List the open pull requests that the user created. */
  createdByMe: boolean;
  /** List the open pull requests whose review is requested from the user. */
  reviewRequests: boolean;
  /** List draft pull requests too. */
  drafts: boolean;
  /** `owner/repo` names; an empty list means every repository. */
  repositories: string[];
}

export type ToggleName = 'createdByMe' | 'reviewRequests' | 'drafts';

const BASE_QUERY = 'is:pr is:open';
const MINE_QUALIFIER = 'author:@me';
const REVIEW_QUALIFIER = 'review-requested:@me';
const REPOSITORY_NAME = /^[\w.-]+\/[\w.-]+$/;
const LINE_BREAKS = /\r?\n/;

export class PullRequestFilters {
  /**
   * @returns The filters of a new live folder: both lists and the drafts on, every repository.
   */
  public static defaults(): PullRequestFilterValues {
    return { createdByMe: true, reviewRequests: true, drafts: true, repositories: [] };
  }

  /**
   * Reads filters that were stored, tolerating anything: a missing or wrong field takes its default.
   *
   * @param value What was stored.
   * @returns Valid filters.
   */
  public static from(value: unknown): PullRequestFilterValues {
    const stored = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    const defaults = PullRequestFilters.defaults();
    const flag = (name: ToggleName): boolean => (typeof stored[name] === 'boolean' ? stored[name] : defaults[name]);
    const repositories = stored['repositories'];
    return {
      createdByMe: flag('createdByMe'),
      reviewRequests: flag('reviewRequests'),
      drafts: flag('drafts'),
      repositories: Array.isArray(repositories) ? PullRequestFilters.#repositoriesIn(repositories.filter((name): name is string => typeof name === 'string')) : [],
    };
  }

  /**
   * One GitHub search per enabled list. Drafts off adds `draft:false`, and each repository adds a
   * `repo:` qualifier, which GitHub joins with OR.
   *
   * @param filters The filters of a folder.
   * @returns The search queries; none when both lists are off.
   */
  public static queries(filters: PullRequestFilterValues): string[] {
    const lists = [filters.createdByMe ? MINE_QUALIFIER : null, filters.reviewRequests ? REVIEW_QUALIFIER : null];
    const narrowing = [filters.drafts ? null : 'draft:false', ...filters.repositories.map((name) => `repo:${name}`)];
    return lists.flatMap((list) => (list === null ? [] : [[BASE_QUERY, list, ...narrowing.filter((part) => part !== null)].join(' ')]));
  }

  /**
   * @param filters The filters of a folder.
   * @param name The filter to flip.
   * @returns The filters with that one flipped.
   */
  public static toggled(filters: PullRequestFilterValues, name: ToggleName): PullRequestFilterValues {
    return { ...filters, [name]: !filters[name] };
  }

  /**
   * @param text Lines typed by the user, one `owner/repo` each.
   * @returns The valid names, each once, in order; other lines are dropped.
   */
  public static parseRepositories(text: string): string[] {
    return PullRequestFilters.#repositoriesIn(text.split(LINE_BREAKS));
  }

  /**
   * @param repositories The repository names of a folder.
   * @returns The text to edit, one name per line.
   */
  public static formatRepositories(repositories: string[]): string {
    return repositories.join('\n');
  }

  static #repositoriesIn(lines: string[]): string[] {
    return [...new Set(lines.map((line) => line.trim()).filter((line) => REPOSITORY_NAME.test(line)))];
  }
}
