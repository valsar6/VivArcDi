import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const PROFILE_MARKERS = ['Local State', join('Default', 'Preferences')];

/**
 * @param home The user's home folder.
 * @returns The folders where Vivaldi keeps the user's own profiles on macOS and Debian.
 */
export function userProfileRoots(home: string = homedir()): string[] {
  return [
    join(home, 'Library', 'Application Support', 'Vivaldi'),
    join(home, 'Library', 'Application Support', 'Vivaldi Snapshot'),
    join(home, '.config', 'vivaldi'),
    join(home, '.config', 'vivaldi-snapshot'),
  ];
}

export class ProfileDirectory {
  readonly #path: string;

  private constructor(path: string) {
    this.#path = path;
  }

  /**
   * Uses a folder as the lab profile after checking that it holds no Vivaldi profile.
   *
   * @param path Folder for the user data of the lab Vivaldi.
   * @param fixture Preferences file copied into the new profile.
   * @param userRoots Folders of the user's own profiles, which are always refused.
   * @returns The lab profile.
   * @throws {Error} When the folder holds a profile or lies inside a user profile root.
   */
  public static async at(path: string, fixture: string, userRoots: string[] = userProfileRoots()): Promise<ProfileDirectory> {
    const target = resolve(path);
    if (userRoots.some((root) => isInside(target, resolve(root)))) {
      throw new Error(`${target} belongs to a Vivaldi profile of the user, refusing to use it`);
    }
    if (PROFILE_MARKERS.some((marker) => existsSync(join(target, marker)))) {
      throw new Error(`${target} already holds a Vivaldi profile, refusing to use it`);
    }
    await mkdir(join(target, 'Default'), { recursive: true });
    await cp(fixture, join(target, 'Default', 'Preferences'));
    return new ProfileDirectory(target);
  }

  /**
   * Creates a new, empty lab profile in the system's temporary folder.
   *
   * @param fixture Preferences file copied into the new profile.
   * @returns The lab profile.
   */
  public static async temporary(fixture: string): Promise<ProfileDirectory> {
    return ProfileDirectory.at(await mkdtemp(join(tmpdir(), 'vivarcdi-live-')), fixture);
  }

  /**
   * @returns The folder passed to Vivaldi as `--user-data-dir`.
   */
  public get path(): string {
    return this.#path;
  }

  /**
   * Deletes the profile and everything Vivaldi wrote into it.
   */
  public async remove(): Promise<void> {
    await rm(this.#path, { recursive: true, force: true });
  }
}

function isInside(path: string, root: string): boolean {
  const offset = relative(root, path);
  return offset === '' || (!offset.startsWith('..') && !offset.startsWith('/'));
}
