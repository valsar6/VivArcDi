import { Logger } from '../../../src/core/Logger.js';
import type { LogSink } from '../../../src/core/Logger.js';
import { CODE_URL, TOKEN_URL } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import type { DeviceFetch } from '../../../src/modules/livefolders/GithubDeviceFlow.js';
import type { GithubFetch, GithubResponse, SearchItem } from '../../../src/modules/livefolders/GithubPullRequests.js';
import { settle } from '../reopen/fakes.js';

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
  method: string;
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
    this.requests.push({ url, method: init.method, query, headers: init.headers });
    if (this.unreachable) {
      throw new TypeError('network down');
    }
    if (new URL(url).pathname === '/user') {
      return { ok: this.status === 200, status: this.status, json: async () => ({ login: ME }) };
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

export interface DeviceRequest {
  url: string;
  fields: Record<string, string>;
}

/** GitHub's device flow: hands out a code, then answers each check with the next scripted answer. */
export class FakeDeviceGithub {
  public requests: DeviceRequest[] = [];
  public answers: Array<Record<string, unknown>> = [];
  public unreachable = false;
  public code: Record<string, unknown> = { device_code: 'dev-123', user_code: 'WDJB-MJHT', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 };

  public send: DeviceFetch = async (url, init) => {
    this.requests.push({ url, fields: Object.fromEntries(new URLSearchParams(init.body)) });
    if (this.unreachable) {
      throw new TypeError('network down');
    }
    const body = url === CODE_URL ? this.code : (this.answers.shift() ?? { error: 'authorization_pending' });
    return { ok: true, status: 200, json: async () => body };
  };

  public get checks(): DeviceRequest[] {
    return this.requests.filter((request) => request.url === TOKEN_URL);
  }
}

/** Timers that run only when the test says so, and remember the delay of each. */
export class ManualTimers {
  public delays: number[] = [];
  public pending: Array<{ run: () => void; handle: number }> = [];
  #next = 0;

  public set = (run: () => void, delayMs: number): unknown => {
    this.delays.push(delayMs);
    this.#next += 1;
    this.pending.push({ run, handle: this.#next });
    return this.#next;
  };

  public clear = (handle: unknown): void => {
    this.pending = this.pending.filter((timer) => timer.handle !== handle);
  };

  public async fire(): Promise<void> {
    const timer = this.pending.shift();
    timer?.run();
    await settle();
  }
}
