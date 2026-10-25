import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SemanticVersion } from './SemanticVersion.js';

const INSTALLER_VERSION = /^__version__ = "([^"]+)"$/m;

export type FileReader = (path: string) => string;

export class VersionSources {
  #read: FileReader;

  /**
   * Reads the project version from the two places that hold it: `package.json`
   * for the build and `installer/vivarcdi/__init__.py` for the installer, which
   * writes it into `build.json` and the loader prints it.
   *
   * @param read Returns the text of a file given its repository path.
   */
  constructor(read: FileReader) {
    this.#read = read;
  }

  /**
   * @param root Repository root on disk.
   * @returns Sources that read the working tree.
   */
  public static fromDisk(root: string): VersionSources {
    return new VersionSources((path) => readFileSync(join(root, path), 'utf8'));
  }

  /**
   * @returns The version in `package.json`.
   */
  public packageVersion(): SemanticVersion {
    const manifest = JSON.parse(this.#read('package.json')) as { version?: string };
    return SemanticVersion.parse(manifest.version ?? '');
  }

  /**
   * @returns The version in the installer package.
   * @throws {Error} When the installer declares no `__version__`.
   */
  public installerVersion(): SemanticVersion {
    const match = INSTALLER_VERSION.exec(this.#read('installer/vivarcdi/__init__.py'));
    if (match?.[1] === undefined) {
      throw new Error('installer/vivarcdi/__init__.py declares no __version__');
    }
    return SemanticVersion.parse(match[1]);
  }

  /**
   * @returns The project version, once both sources agree.
   * @throws {Error} When `package.json` and the installer disagree.
   */
  public version(): SemanticVersion {
    const manifest = this.packageVersion();
    const installer = this.installerVersion();
    if (!manifest.equals(installer)) {
      throw new Error(
        `package.json says ${manifest.toString()} but the installer says ${installer.toString()}; update both`,
      );
    }
    return manifest;
  }
}
