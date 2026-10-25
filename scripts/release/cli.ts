import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { BranchPolicy } from './BranchPolicy.js';
import { VersionSources } from './VersionSources.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

class ReleaseCli {
  #root: string;

  /**
   * Command line used by CI: `version` prints the project version, `tag` prints its git tag,
   * `check --base <git ref> --branch <name>` enforces the branch and version policy.
   *
   * @param root Repository root.
   */
  constructor(root: string) {
    this.#root = root;
  }

  /**
   * @param argv Arguments after the script name.
   * @returns The process exit code.
   */
  public run(argv: string[]): number {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { base: { type: 'string' }, branch: { type: 'string' } },
    });
    const version = VersionSources.fromDisk(this.#root).version();
    const command = positionals[0];
    if (command === 'version' || command === 'tag') {
      console.log(command === 'tag' ? version.tag : version.toString());
      return 0;
    }
    if (command === 'check' && values.base !== undefined && values.branch !== undefined) {
      const base = new VersionSources((path) => this.#readAt(values.base ?? '', path)).version();
      const verdict = new BranchPolicy().judge(values.branch, base, version);
      console.log(verdict.message);
      return verdict.ok ? 0 : 1;
    }
    console.error('Usage: release version | tag | check --base <git ref> --branch <name>');
    return 2;
  }

  #readAt(ref: string, path: string): string {
    return execFileSync('git', ['show', `${ref}:${path}`], { cwd: this.#root, encoding: 'utf8' });
  }
}

try {
  process.exitCode = new ReleaseCli(ROOT).run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
