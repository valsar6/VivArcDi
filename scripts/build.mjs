import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_FOLDER = 'page';

class SourceTree {
  #root;

  /**
   * Lists the files of a folder, recursively.
   *
   * @param {string} root Absolute folder path.
   */
  constructor(root) {
    this.#root = root;
  }

  /**
   * @param {(path: string) => boolean} accepts Filter on the path relative to the folder.
   * @returns {Promise<string[]>} Relative paths of the accepted files, sorted.
   */
  async files(accepts) {
    const entries = await readdir(this.#root, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => relative(this.#root, join(entry.parentPath, entry.name)))
      .filter(accepts)
      .sort();
  }
}

class ScriptBuilder {
  #sourceDir;
  #outputDir;

  /**
   * Transpiles TypeScript files to ES modules, one output file per source file,
   * so the loader can keep resolving modules by URL.
   *
   * @param {string} sourceDir Folder with the TypeScript sources.
   * @param {string} outputDir Folder that receives the JavaScript files.
   */
  constructor(sourceDir, outputDir) {
    this.#sourceDir = sourceDir;
    this.#outputDir = outputDir;
  }

  /**
   * @returns {Promise<void>}
   */
  async run() {
    const sources = await new SourceTree(this.#sourceDir).files(
      (path) => path.endsWith('.ts') && !path.startsWith(`${PAGE_FOLDER}/`),
    );
    await build({
      entryPoints: sources.map((path) => join(this.#sourceDir, path)),
      outdir: this.#outputDir,
      outbase: this.#sourceDir,
      bundle: false,
      format: 'esm',
      target: 'es2022',
      platform: 'browser',
      logLevel: 'warning',
    });
  }
}

class PageScriptBuilder {
  #sourceDir;
  #outputDir;

  /**
   * Bundles each script injected into web pages into one self-contained file, because
   * pages cannot import the payload's modules. `peek-links.ts` becomes `peek-links.js`,
   * which defines the global object `VivArcDiPeekLinks` with the file's exports.
   *
   * @param sourceDir Folder with the page entry points; helpers live in its subfolders.
   * @param outputDir Folder that receives the bundles.
   */
  constructor(sourceDir, outputDir) {
    this.#sourceDir = sourceDir;
    this.#outputDir = outputDir;
  }

  /**
   * @returns {Promise<void>}
   */
  async run() {
    const entries = await new SourceTree(this.#sourceDir).files((path) => path.endsWith('.ts') && !path.includes('/'));
    for (const entry of entries) {
      await build({
        entryPoints: [join(this.#sourceDir, entry)],
        outfile: join(this.#outputDir, entry.replace(/\.ts$/, '.js')),
        bundle: true,
        format: 'iife',
        globalName: PageScriptBuilder.globalNameOf(entry),
        target: 'es2022',
        platform: 'browser',
        logLevel: 'warning',
      });
    }
  }

  /**
   * @param {string} entry File name such as `peek-links.ts`.
   * @returns {string} Global name such as `VivArcDiPeekLinks`.
   */
  static globalNameOf(entry) {
    const words = entry.replace(/\.ts$/, '').split('-');
    return `VivArcDi${words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`;
  }
}

class StyleBuilder {
  #sourceDir;
  #outputDir;

  /**
   * Compiles SCSS files to CSS. Partials, whose name starts with an underscore, are skipped.
   *
   * @param {string} sourceDir Folder with the SCSS sources.
   * @param {string} outputDir Folder that receives the CSS files.
   */
  constructor(sourceDir, outputDir) {
    this.#sourceDir = sourceDir;
    this.#outputDir = outputDir;
  }

  /**
   * @returns {Promise<void>}
   */
  async run() {
    const entries = await new SourceTree(this.#sourceDir).files(
      (path) => path.endsWith('.scss') && !path.split('/').pop().startsWith('_'),
    );
    await mkdir(this.#outputDir, { recursive: true });
    for (const entry of entries) {
      const { css } = sass.compile(join(this.#sourceDir, entry), { style: 'expanded' });
      await writeFile(join(this.#outputDir, entry.replace(/\.scss$/, '.css')), `${css}\n`);
    }
  }
}

class AssetCopier {
  #sourceDir;
  #outputDir;

  /**
   * Copies the static files of the payload, such as `config.json` and the selector catalogs.
   *
   * @param {string} sourceDir Folder with the static files.
   * @param {string} outputDir Folder that receives the copies.
   */
  constructor(sourceDir, outputDir) {
    this.#sourceDir = sourceDir;
    this.#outputDir = outputDir;
  }

  /**
   * @returns {Promise<void>}
   */
  async run() {
    const assets = await new SourceTree(this.#sourceDir).files((path) => path.endsWith('.json'));
    for (const asset of assets) {
      const target = join(this.#outputDir, asset);
      await mkdir(dirname(target), { recursive: true });
      await cp(join(this.#sourceDir, asset), target);
    }
  }
}

class BuildPipeline {
  #sourceDir;
  #outputDir;

  /**
   * Builds the payload that the installer deploys into Vivaldi.
   *
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.#sourceDir = join(root, 'src');
    this.#outputDir = join(root, 'dist');
  }

  /**
   * Empties the output folder, then builds scripts, styles and static files into it.
   *
   * @returns {Promise<void>}
   */
  async run() {
    await rm(this.#outputDir, { recursive: true, force: true });
    await mkdir(this.#outputDir, { recursive: true });
    await new ScriptBuilder(this.#sourceDir, this.#outputDir).run();
    await new PageScriptBuilder(join(this.#sourceDir, PAGE_FOLDER), join(this.#outputDir, PAGE_FOLDER)).run();
    await new StyleBuilder(join(this.#sourceDir, 'styles'), join(this.#outputDir, 'styles')).run();
    await new AssetCopier(this.#sourceDir, this.#outputDir).run();
  }
}

await new BuildPipeline(ROOT).run();
