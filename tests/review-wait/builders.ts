import type { ChangedFile, ChangeType, MergedPullRequest } from '../../scripts/review-wait/PullRequestSource.js';

export type FileSpec = [path: string, changeType: ChangeType];

export function pullRequest(number: number, files: FileSpec[], createdAt: string, mergedAt: string): MergedPullRequest {
  return {
    number,
    title: `Pull request ${number}`,
    branch: `branch-${number}`,
    createdAt: new Date(createdAt),
    mergedAt: new Date(mergedAt),
    files: files.map(([path, changeType]) => ({ path, changeType })),
  };
}

export function changed(...files: FileSpec[]): ChangedFile[] {
  return files.map(([path, changeType]) => ({ path, changeType }));
}
