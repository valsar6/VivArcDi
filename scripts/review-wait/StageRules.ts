import type { ChangedFile } from './PullRequestSource.js';

export type Stage = 'spec' | 'design' | 'code' | 'implemented';

export interface Classification {
  specs: string[];
  stage: Stage | null;
}

const SPEC_FOLDER = /^specs\/(\d{3}-[a-z0-9-]+)\//;
const SPEC_FILE = /^specs\/\d{3}-[a-z0-9-]+\/spec\.md$/;
const DESIGN_FILE = /^specs\/\d{3}-[a-z0-9-]+\/(design|tasks)\.md$/;
const SPEC_INDEX = 'specs/README.md';
const CODE_ROOTS = ['src/', 'installer/', 'packaging/', 'scripts/', 'tests/'];

function added(files: ChangedFile[], pattern: RegExp): boolean {
  return files.some((file) => file.changeType === 'ADDED' && pattern.test(file.path));
}

function isStatusFile(file: ChangedFile): boolean {
  return file.changeType === 'MODIFIED' && (SPEC_FILE.test(file.path) || file.path === SPEC_INDEX);
}

function specsOf(files: ChangedFile[]): string[] {
  const folders = files.map((file) => SPEC_FOLDER.exec(file.path)?.[1]);
  return [...new Set(folders.filter((folder): folder is string => folder !== undefined))];
}

function stageOf(files: ChangedFile[]): Stage | null {
  if (files.some((file) => CODE_ROOTS.some((root) => file.path.startsWith(root)))) {
    return 'code';
  }
  if (added(files, DESIGN_FILE)) {
    return 'design';
  }
  if (added(files, SPEC_FILE)) {
    return 'spec';
  }
  return files.length > 0 && files.every(isStatusFile) ? 'implemented' : null;
}

export class StageRules {
  /**
   * Tells which specs a pull request belongs to and at which stage of the spec-driven flow it is.
   *
   * @param files The files the pull request changes, with how each one changes.
   * @returns The folders of the specs it touches, in path order, and its stage; the stage is null
   *   when the files fit none of spec, design, code or implemented.
   */
  public static classify(files: ChangedFile[]): Classification {
    return { specs: specsOf(files), stage: stageOf(files) };
  }
}
