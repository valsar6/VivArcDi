import { Logger } from '../../../src/core/Logger.js';
import type { LogSink } from '../../../src/core/Logger.js';
import type { GithubFetch, GithubResponse, SearchItem } from '../../../src/modules/livefolders/GithubPullRequests.js';

export const ME = 'tore';

export interface FakePullRequest {
  id: number;
  title: string;
  author: string;
  repository: string;
  updatedAt: string;
  draft: boolean;
  open: boolean;
  reviewRequested: boolean;
}

export const pullRequest = (id: number, changes: Partial<FakePullRequest> = {}): FakePullRequest => ({
  id,
  title: `Pull request ${id}`,
  author: ME,
  repository: 'valsar6/VivArcDi',
  updatedAt: `2026-11-0${id}T10:00:00Z`,
  draft: false,
  open: true,
  reviewRequested: false,
  ...changes,
});

export interface Request {
  url: string;
  query: string;
  headers: Record<string, string>;
}

/** A GitHub that answers the search with the pull requests of a fixture that match the qualifiers of the query. */
export class FakeGithub {
  public pullRequests: FakePullRequest[];
  public requests: Request[] = [];
  public status = 200;
  public unreachable = false;

  constructor(pullRequests: FakePullRequest[]) {
    this.pullRequests = pullRequests;
  }

  public fetch: GithubFetch = async (url, init) => {
    const query = new URL(url).searchParams.get('q') ?? '';
    this.requests.push({ url, query, headers: init.headers });
    if (this.unreachable) {
      throw new TypeError('network down');
    }
    const items = this.status === 200 ? this.pullRequests.filter((candidate) => FakeGithub.#matches(candidate, query)).map(FakeGithub.#item) : [];
    const response: GithubResponse = { ok: this.status === 200, status: this.status, json: async () => ({ items }) };
    return response;
  };

  public get queries(): string[] {
    return this.requests.map((request) => request.query);
  }

  static #matches(candidate: FakePullRequest, query: string): boolean {
    const parts = query.split(' ');
    const repositories = parts.filter((part) => part.startsWith('repo:')).map((part) => part.slice('repo:'.length));
    const qualifiers: Array<[string, boolean]> = [
      ['author:@me', candidate.author === ME],
      ['review-requested:@me', candidate.reviewRequested],
      ['draft:false', !candidate.draft],
    ];
    const inRepository = repositories.length === 0 || repositories.includes(candidate.repository);
    return candidate.open === parts.includes('is:open') && inRepository && qualifiers.every(([qualifier, holds]) => !parts.includes(qualifier) || holds);
  }

  static #item(candidate: FakePullRequest): SearchItem {
    return {
      id: candidate.id,
      title: candidate.title,
      html_url: `https://github.com/${candidate.repository}/pull/${candidate.id}`,
      updated_at: candidate.updatedAt,
      user: { login: candidate.author },
      repository_url: `https://api.github.com/repos/${candidate.repository}`,
    };
  }
}

export class RecordingSink implements LogSink {
  public lines: string[] = [];

  public info = (...message: unknown[]): void => void this.lines.push(message.map(String).join(' '));
  public warn = (...message: unknown[]): void => void this.lines.push(message.map(String).join(' '));
  public error = (...message: unknown[]): void => void this.lines.push(message.map(String).join(' '));
}

export const recordingLogger = (): { logger: Logger; sink: RecordingSink } => {
  const sink = new RecordingSink();
  return { logger: new Logger('test', sink), sink };
};

export class MemoryStorage {
  public items = new Map<string, string>();
  public writes: string[] = [];

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.items.set(key, value);
    this.writes.push(value);
  }
}

export class ManualTicker {
  public runs: Array<() => void> = [];
  public intervals: number[] = [];

  public every = (run: () => void, intervalMs: number): (() => void) => {
    this.runs.push(run);
    this.intervals.push(intervalMs);
    return () => {
      this.runs = this.runs.filter((candidate) => candidate !== run);
    };
  };

  public tick(): void {
    this.runs.forEach((run) => run());
  }
}
