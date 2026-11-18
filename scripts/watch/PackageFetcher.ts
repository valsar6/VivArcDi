import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import type { Fetch, PackageEntry } from './AptIndex.js';
import { VIVALDI_REPOSITORY } from './AptIndex.js';

export type Unpacker = (deb: string, root: string) => Promise<void>;

const unpackWithDpkg: Unpacker = async (deb, root) => {
  await promisify(execFile)('dpkg-deb', ['-x', deb, root]);
};

export class PackageFetcher {
  #fetch: Fetch;
  #unpack: Unpacker;
  #repository: string;

  /**
   * Downloads a package of the apt index, checks it and unpacks it without installing it.
   *
   * @param fetchImpl Fetches a URL; a fake in tests.
   * @param unpack Unpacks a `.deb` into a folder; `dpkg-deb -x` by default.
   * @param repository Base URL of the apt repository, ending with a slash.
   */
  constructor(fetchImpl: Fetch = fetch, unpack: Unpacker = unpackWithDpkg, repository = VIVALDI_REPOSITORY) {
    this.#fetch = fetchImpl;
    this.#unpack = unpack;
    this.#repository = repository;
  }

  /**
   * @param entry The package to fetch.
   * @param folder Work folder; it receives the `.deb` and the `root/` it unpacks to.
   * @returns The root folder, laid out like `/`, e.g. holding `opt/vivaldi-snapshot`.
   * @throws {Error} When the download fails or its SHA256 differs from the index.
   */
  public async fetch(entry: PackageEntry, folder: string): Promise<string> {
    const url = new URL(entry.filename, this.#repository).href;
    const response = await this.#fetch(url);
    if (!response.ok) {
      throw new Error(`Cannot download ${url}: HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== entry.sha256) {
      throw new Error(`${basename(entry.filename)} has SHA256 ${digest}, the index lists ${entry.sha256}`);
    }
    const root = join(folder, 'root');
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    const deb = join(folder, basename(entry.filename));
    await writeFile(deb, bytes);
    await this.#unpack(deb, root);
    return root;
  }
}
