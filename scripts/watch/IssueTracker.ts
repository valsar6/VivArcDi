import { INFRASTRUCTURE_LABEL, IssueText, WATCH_LABEL } from './IssueText.js';
import type { Channel, WatchResult } from './IssueText.js';

export type GitHubFetch = (url: string, init?: RequestInit) => Promise<Response>;

interface Issue {
  number: number;
  title: string;
  pull_request?: unknown;
}

const API = 'https://api.github.com';

export class IssueTracker {
  #repository: string;
  #token: string;
  #fetch: GitHubFetch;

  /**
   * Keeps one GitHub issue per broken Vivaldi build, as spec 047 describes.
   *
   * @param repository `owner/name`.
   * @param token A token allowed to write issues, usually the workflow's `GITHUB_TOKEN`.
   * @param fetchImpl Fetches a URL; a fake in tests.
   */
  constructor(repository: string, token: string, fetchImpl: GitHubFetch = fetch) {
    this.#repository = repository;
    this.#token = token;
    this.#fetch = fetchImpl;
  }

  /**
   * Opens, comments on or closes the issues of the result's channel.
   *
   * @param result The result of one watch run.
   * @returns What was done, for the job summary, e.g. `opened #12`.
   * @throws {Error} When GitHub refuses a request.
   */
  public async report(result: WatchResult): Promise<string> {
    const open = await this.#openIssues(result.channel);
    if (result.outcome === 'pass') {
      return this.#closeAll(open, result);
    }
    const same = open.find((issue) => IssueText.versionIn(issue.title, result.channel) === result.version);
    const target = same ?? (result.outcome === 'infrastructure' ? open[0] : undefined);
    if (target === undefined) {
      return this.#open(result);
    }
    await this.#comment(target.number, IssueText.report(result));
    if (result.outcome === 'infrastructure') {
      await this.#call(`issues/${target.number}/labels`, 'POST', { labels: [INFRASTRUCTURE_LABEL] });
    }
    return `commented on #${target.number}`;
  }

  async #openIssues(channel: Channel): Promise<Issue[]> {
    const labels = encodeURIComponent(`${WATCH_LABEL},${IssueText.channelLabel(channel)}`);
    const issues = (await this.#call(`issues?state=open&labels=${labels}&per_page=100`, 'GET')) as Issue[];
    return issues.filter((issue) => issue.pull_request === undefined).sort((a, b) => b.number - a.number);
  }

  async #open(result: WatchResult): Promise<string> {
    const labels = [WATCH_LABEL, IssueText.channelLabel(result.channel)];
    if (result.outcome === 'infrastructure') {
      labels.push(INFRASTRUCTURE_LABEL);
    }
    const body = { title: IssueText.title(result.channel, result.version), body: IssueText.report(result), labels };
    const created = (await this.#call('issues', 'POST', body)) as Issue;
    return `opened #${created.number}`;
  }

  async #closeAll(open: Issue[], result: WatchResult): Promise<string> {
    for (const issue of open) {
      await this.#comment(issue.number, IssueText.report(result));
      await this.#call(`issues/${issue.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
    }
    return open.length === 0 ? 'no open issue' : `closed ${open.map((issue) => `#${issue.number}`).join(', ')}`;
  }

  async #comment(issue: number, body: string): Promise<void> {
    await this.#call(`issues/${issue}/comments`, 'POST', { body });
  }

  async #call(path: string, method: string, body?: object): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.#token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.#fetch(`${API}/repos/${this.#repository}/${path}`, init);
    if (!response.ok) {
      throw new Error(`GitHub ${method} ${path} answered HTTP ${response.status}`);
    }
    return response.json();
  }
}
