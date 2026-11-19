export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'CHANGED';

export interface ChangedFile {
  path: string;
  changeType: ChangeType;
}

export interface MergedPullRequest {
  number: number;
  title: string;
  branch: string;
  createdAt: Date;
  mergedAt: Date;
  files: ChangedFile[];
}

export interface PullRequestSource {
  merged(): Promise<MergedPullRequest[]>;
}
