import { spawn } from 'node:child_process';
import type { ChangedFile, MergedPullRequest, PullRequestSource } from './PullRequestSource.js';

export type GhRunner = (args: string[]) => Promise<string>;

export const READ_COMMANDS: ReadonlyArray<readonly [string, string]> = [
  ['pr', 'list'],
  ['pr', 'view'],
];

const MERGED_ARGS: string[] = [
  'pr',
  'list',
  '--state',
  'merged',
  '--limit',
  '1000',
  '--json',
  'number,title,createdAt,mergedAt,headRefName,files',
];

interface RawPullRequest {
  number: number;
  title: string;
  createdAt: string;
  mergedAt: string;
  headRefName: string;
  files: ChangedFile[];
}

/**
 * Runs the real `gh` and returns what it prints.
 *
 * @param args The arguments after `gh`.
 * @returns The standard output of the command.
 * @throws {Error} When `gh` cannot start or exits with a non-zero code.
 */
export const spawnGh: GhRunner = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out).toString('utf8'));
        return;
      }
      reject(new Error(`gh ${args.join(' ')} exited with ${code}: ${Buffer.concat(err).toString('utf8').trim()}`));
    });
  });

export class GhCli implements PullRequestSource {
  #runner: GhRunner;

  /**
   * Reads merged pull requests through `gh`, and only reads.
   *
   * @param runner Runs `gh` with the given arguments; a fake in tests.
   */
  constructor(runner: GhRunner = spawnGh) {
    this.#runner = runner;
  }

  /**
   * Runs one `gh` command if it is a read command.
   *
   * @param args The arguments after `gh`.
   * @returns The standard output of the command.
   * @throws {Error} When the first two arguments are not in `READ_COMMANDS`.
   */
  public run(args: string[]): Promise<string> {
    const allowed = READ_COMMANDS.some(([group, action]) => args[0] === group && args[1] === action);
    if (!allowed) {
      throw new Error(`gh ${args.slice(0, 2).join(' ')} is not a read command`);
    }
    return this.#runner(args);
  }

  /**
   * Lists the merged pull requests with their changed files.
   *
   * @returns The pull requests, with real dates.
   * @throws {Error} When `gh` fails or prints something that is not JSON.
   */
  public async merged(): Promise<MergedPullRequest[]> {
    const raw = JSON.parse(await this.run(MERGED_ARGS)) as RawPullRequest[];
    return raw.map((item) => ({
      number: item.number,
      title: item.title,
      branch: item.headRefName,
      createdAt: new Date(item.createdAt),
      mergedAt: new Date(item.mergedAt),
      files: item.files.map(({ path, changeType }) => ({ path, changeType })),
    }));
  }
}
