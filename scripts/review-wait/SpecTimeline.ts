import type { MergedPullRequest } from './PullRequestSource.js';
import { StageRules, type Stage } from './StageRules.js';
import { WaitStatistics, type WaitSummary } from './WaitStatistics.js';

export const STAGES: Stage[] = ['spec', 'design', 'code', 'implemented'];

export interface SpecRow {
  spec: string;
  waits: Partial<Record<Stage, number>>;
  cycle: number | null;
  manual: number | null;
}

export interface Timeline {
  stages: Record<Stage, WaitSummary>;
  specs: SpecRow[];
  apart: number;
}

interface StagedRequest {
  stage: Stage;
  createdAt: number;
  mergedAt: number;
}

function wait(request: StagedRequest): number {
  return request.mergedAt - request.createdAt;
}

function lastMerge(requests: StagedRequest[], stage: Stage): number | null {
  const merges = requests.filter((request) => request.stage === stage).map((request) => request.mergedAt);
  return merges.length > 0 ? Math.max(...merges) : null;
}

function longestWaits(requests: StagedRequest[]): Partial<Record<Stage, number>> {
  const waits: Partial<Record<Stage, number>> = {};
  for (const request of requests) {
    waits[request.stage] = Math.max(waits[request.stage] ?? 0, wait(request));
  }
  return waits;
}

function rowOf(spec: string, requests: StagedRequest[]): SpecRow {
  const implemented = lastMerge(requests, 'implemented');
  const code = lastMerge(requests, 'code');
  const opened = Math.min(...requests.map((request) => request.createdAt));
  const manual = implemented !== null && code !== null && implemented >= code ? implemented - code : null;
  return {
    spec,
    waits: longestWaits(requests),
    cycle: implemented === null ? null : implemented - opened,
    manual,
  };
}

export class SpecTimeline {
  /**
   * Groups merged pull requests by stage and by spec and computes their waits.
   *
   * @param pullRequests The merged pull requests.
   * @param since Ignores the pull requests merged before this moment; null keeps them all.
   * @returns The summary of each stage (a pull request counts once there), one row per spec (a
   *   pull request is in the row of every spec it touches) and how many pull requests fit no spec
   *   or no stage.
   */
  public static build(pullRequests: MergedPullRequest[], since: Date | null): Timeline {
    const bySpec = new Map<string, StagedRequest[]>();
    const waitsByStage: Record<Stage, number[]> = { spec: [], design: [], code: [], implemented: [] };
    let apart = 0;
    for (const pullRequest of pullRequests) {
      if (since !== null && pullRequest.mergedAt < since) {
        continue;
      }
      const { specs, stage } = StageRules.classify(pullRequest.files);
      if (stage === null || specs.length === 0) {
        apart += 1;
        continue;
      }
      const request = { stage, createdAt: pullRequest.createdAt.getTime(), mergedAt: pullRequest.mergedAt.getTime() };
      waitsByStage[stage].push(wait(request));
      for (const spec of specs) {
        bySpec.set(spec, [...(bySpec.get(spec) ?? []), request]);
      }
    }
    const stages = Object.fromEntries(STAGES.map((stage) => [stage, WaitStatistics.summarise(waitsByStage[stage])]));
    const specs = [...bySpec.keys()].sort().map((spec) => rowOf(spec, bySpec.get(spec) ?? []));
    return { stages: stages as Record<Stage, WaitSummary>, specs, apart };
  }
}
