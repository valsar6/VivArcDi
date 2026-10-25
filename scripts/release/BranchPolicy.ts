import type { Bump, SemanticVersion } from './SemanticVersion.js';

interface Rule {
  prefix: string;
  bump: Bump;
  purpose: string;
}

const RULES: readonly Rule[] = [
  { prefix: 'features/', bump: 'minor', purpose: 'a feature' },
  { prefix: 'fix/', bump: 'patch', purpose: 'a fix' },
];

const OTHER: Rule = { prefix: '', bump: 'none', purpose: 'neither a feature nor a fix' };

export interface Verdict {
  /** Whether the change follows the policy. */
  ok: boolean;
  /** One line for the person reading the CI log. */
  message: string;
}

export class BranchPolicy {
  #highestMajor: number;

  /**
   * Ties the version change of a pull request to its branch name:
   * `features/<name>` raises the minor version, `fix/<name>` the patch version,
   * and any other branch leaves the version alone.
   *
   * @param highestMajor Major versions above this one are refused; 0 while the project is pre-1.0.
   */
  constructor(highestMajor = 0) {
    this.#highestMajor = highestMajor;
  }

  /**
   * @param branch Name of the pull request branch.
   * @param base Version on the target branch.
   * @param head Version on the pull request branch.
   * @returns Whether the change follows the policy, and why.
   */
  public judge(branch: string, base: SemanticVersion, head: SemanticVersion): Verdict {
    const rule = RULES.find(({ prefix }) => branch.startsWith(prefix)) ?? OTHER;
    const actual = head.bumpFrom(base);
    if (head.major > this.#highestMajor) {
      return { ok: false, message: `Version ${head.toString()} is above major ${this.#highestMajor}` };
    }
    if (actual !== rule.bump) {
      const expected = rule.bump === 'none' ? 'keep the version' : `make a ${rule.bump} bump`;
      return {
        ok: false,
        message: `${branch} is ${rule.purpose}, so it must ${expected}; found ${base.toString()} -> ${head.toString()} (${actual})`,
      };
    }
    return { ok: true, message: `${branch}: ${base.toString()} -> ${head.toString()} (${actual}) follows the policy` };
  }
}
