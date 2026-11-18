import { compareDebianVersions } from './DebianVersion.js';

export const VIVALDI_REPOSITORY = 'https://repo.vivaldi.com/archive/deb/';
const INDEX_PATH = 'dists/stable/main/binary-amd64/Packages';

export interface PackageEntry {
  package: string;
  version: string;
  filename: string;
  sha256: string;
  depends: string[][];
}

export type Fetch = (url: string) => Promise<Response>;

export class AptIndex {
  #entries: PackageEntry[];

  /**
   * The packages listed by an apt `Packages` file.
   *
   * @param text The content of the file.
   */
  constructor(text: string) {
    this.#entries = text
      .split(/\n\s*\n/)
      .map(fields)
      .filter((record) => record.has('Package') && record.has('Version') && record.has('Filename'))
      .map(toEntry);
  }

  /**
   * Downloads the index of a repository.
   *
   * @param fetchImpl Fetches a URL; a fake in tests.
   * @param repository Base URL of the apt repository, ending with a slash.
   * @returns The parsed index.
   * @throws {Error} When the index cannot be downloaded.
   */
  public static async download(fetchImpl: Fetch = fetch, repository = VIVALDI_REPOSITORY): Promise<AptIndex> {
    const url = new URL(INDEX_PATH, repository).href;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Cannot read the apt index ${url}: HTTP ${response.status}`);
    }
    return new AptIndex(await response.text());
  }

  /**
   * @param name Package name, e.g. `vivaldi-snapshot`.
   * @returns The entry with the highest Debian version.
   * @throws {Error} When the index does not list the package.
   */
  public newest(name: string): PackageEntry {
    const candidates = this.#entries.filter((entry) => entry.package === name);
    const [newest] = candidates.sort((a, b) => compareDebianVersions(b.version, a.version));
    if (newest === undefined) {
      throw new Error(`The apt index lists no ${name}`);
    }
    return newest;
  }
}

function fields(paragraph: string): Map<string, string> {
  const record = new Map<string, string>();
  for (const line of paragraph.split('\n')) {
    const match = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (match?.[1] !== undefined) {
      record.set(match[1], match[2] ?? '');
    }
  }
  return record;
}

function toEntry(record: Map<string, string>): PackageEntry {
  return {
    package: record.get('Package') ?? '',
    version: record.get('Version') ?? '',
    filename: record.get('Filename') ?? '',
    sha256: record.get('SHA256') ?? '',
    depends: dependencies(record.get('Depends') ?? ''),
  };
}

function dependencies(field: string): string[][] {
  return field
    .split(',')
    .map((group) => group.split('|').map((alternative) => alternative.replace(/\(.*?\)/g, '').trim()))
    .map((group) => group.filter((name) => name !== ''))
    .filter((group) => group.length > 0);
}
