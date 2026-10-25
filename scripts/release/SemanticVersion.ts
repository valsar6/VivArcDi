export type Bump = 'major' | 'minor' | 'patch' | 'none' | 'irregular';

const PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export class SemanticVersion {
  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;

  /**
   * A `major.minor.patch` version, without pre-release or build parts.
   *
   * @param major Major number.
   * @param minor Minor number.
   * @param patch Patch number.
   */
  constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  /**
   * @param text A version such as `0.3.1`.
   * @returns The parsed version.
   * @throws {Error} When the text is not `major.minor.patch`.
   */
  public static parse(text: string): SemanticVersion {
    const match = PATTERN.exec(text.trim());
    if (match === null) {
      throw new Error(`"${text}" is not a major.minor.patch version`);
    }
    const [, major, minor, patch] = match.map(Number);
    return new SemanticVersion(major ?? 0, minor ?? 0, patch ?? 0);
  }

  /**
   * Names the step from an earlier version to this one. Only a single step counts:
   * `0.2.0 -> 0.3.0` is a minor bump, `0.2.0 -> 0.4.0` or `0.2.0 -> 0.3.1` is irregular.
   *
   * @param previous The version before the change.
   * @returns The kind of bump.
   */
  public bumpFrom(previous: SemanticVersion): Bump {
    if (this.equals(previous)) {
      return 'none';
    }
    const candidates: Array<[Bump, SemanticVersion]> = [
      ['major', new SemanticVersion(previous.major + 1, 0, 0)],
      ['minor', new SemanticVersion(previous.major, previous.minor + 1, 0)],
      ['patch', new SemanticVersion(previous.major, previous.minor, previous.patch + 1)],
    ];
    return candidates.find(([, next]) => next.equals(this))?.[0] ?? 'irregular';
  }

  /**
   * @param other Another version.
   * @returns Whether both versions are the same.
   */
  public equals(other: SemanticVersion): boolean {
    return this.toString() === other.toString();
  }

  /**
   * @returns The version as `major.minor.patch`.
   */
  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  /**
   * @returns The git tag of this version, `v` followed by the version.
   */
  public get tag(): string {
    return `v${this.toString()}`;
  }
}
