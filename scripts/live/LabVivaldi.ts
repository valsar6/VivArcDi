import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface LabBuild {
  executable: string;
  vivaldiVersion: string;
  resourcesDir: string;
  labDir: string;
}

export interface LabOptions {
  channel: 'stable' | 'snapshot';
  vivaldiRoot?: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<string>;

const runCommand: CommandRunner = async (command, args) => (await promisify(execFile)(command, args)).stdout;

export class LabVivaldi {
  #script: string;
  #run: CommandRunner;

  /**
   * Prepares the lab copy of Vivaldi through `scripts/live/lab.py`, which reuses the installer.
   *
   * @param script Path of `lab.py`.
   * @param run Runs a command and returns its output; a fake in tests.
   */
  constructor(script: string, run: CommandRunner = runCommand) {
    this.#script = script;
    this.#run = run;
  }

  /**
   * @param options Channel and, for another build, its root folder.
   * @returns The patched lab copy.
   * @throws {Error} When `lab.py` fails, with its message.
   */
  public async prepare(options: LabOptions): Promise<LabBuild> {
    const args = [this.#script, 'prepare', '--channel', options.channel];
    if (options.vivaldiRoot !== undefined) {
      args.push('--vivaldi', options.vivaldiRoot);
    }
    try {
      return JSON.parse(await this.#run('python3', args)) as LabBuild;
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim();
      throw new Error(stderr || String(error), { cause: error });
    }
  }
}
