import type { Logger } from '../support/Logger.js';
import type { Notices } from '../dom/Notices.js';
import type { BuildInfo } from './types.js';

/** The step of the start that was reached last. */
export type BootStage = 'config' | 'selectors' | 'interface' | 'modules';

/** How a start ended. */
export type BootOutcome = 'active' | 'inactive' | 'failed';

/** What became of one module the start tried. */
export type ModuleOutcome = 'started' | 'failed' | 'invalid-options';

/** What the report needs to know of the selector catalog in use. */
export interface CatalogFacts {
  readonly version: string | null;
  readonly undefinedNames: readonly string[];
  standsInFor(vivaldiVersion: string): boolean;
}

/** The key under which the boot notice is shown once per window session. */
export const BOOT_NOTICE_KEY = 'boot-failed';

/** The module whose mark styles the toast; without it the notice would be an unstyled element. */
export const MARKING_MODULE = 'activation-marker';

/** How many failed modules make a start severe. */
export const SEVERE_FAILURES = 2;

const UNKNOWN = 'unknown';
const NONE = 'none';
const MINOR_PARTS = 2;

/**
 * @param failed How many modules failed to start.
 * @param tried How many modules were tried.
 * @returns The text of the boot notice.
 */
export function bootNoticeText(failed: number, tried: number): string {
  return `VivArcDi could not start ${failed} of ${tried} features: details are in the console`;
}

export class BootReport {
  #logger: Logger;
  #stage: BootStage = 'config';
  #build: BuildInfo | null = null;
  #catalog: CatalogFacts | null = null;
  #skipped = { config: 0, window: 0 };
  #started: string[] = [];
  #failed: string[] = [];
  #invalid: string[] = [];

  /**
   * Collects what one start reached and reports it at the end. It holds no DOM, timer or storage.
   *
   * @param logger The logger of the report, tagged `VivArcDi:boot`.
   */
  constructor(logger: Logger) {
    this.#logger = logger;
  }

  /**
   * @param stage The step the start is entering.
   */
  public enter(stage: BootStage): void {
    this.#stage = stage;
  }

  /**
   * @param build The versions read from `build.json`.
   */
  public useBuild(build: BuildInfo): void {
    this.#build = build;
  }

  /**
   * Keeps the catalog and logs one `info` line when it stands in for a newer Vivaldi.
   *
   * @param catalog The selector catalog in use.
   */
  public useCatalog(catalog: CatalogFacts): void {
    this.#catalog = catalog;
    const vivaldi = this.#build?.vivaldiVersion;
    if (vivaldi !== undefined && catalog.standsInFor(vivaldi)) {
      const shown = vivaldi.split('.').slice(0, MINOR_PARTS).join('.');
      this.#logger.info(`Vivaldi ${shown} has no selector catalog of its own: using ${catalog.version}`);
    }
  }

  /**
   * @param config How many modules `config.json` leaves off.
   * @param window How many modules do not fit this kind of window.
   */
  public skip(config: number, window: number): void {
    this.#skipped = { config, window };
  }

  /**
   * @param id The module id.
   * @param outcome What became of the module.
   */
  public record(id: string, outcome: ModuleOutcome): void {
    const lists: Record<ModuleOutcome, string[]> = {
      started: this.#started,
      failed: this.#failed,
      'invalid-options': this.#invalid,
    };
    lists[outcome].push(id);
  }

  /**
   * Logs one warning per undefined selector, then the summary line. Call it once per start.
   *
   * @param outcome How the start ended.
   */
  public summarize(outcome: BootOutcome): void {
    for (const name of this.#catalog?.undefinedNames ?? []) {
      this.#logger.warn(`selector "${name}" is not defined in catalog ${this.#catalog?.version}`);
    }
    this.#logger[this.#level(outcome)](this.#line(outcome));
  }

  /**
   * Shows the boot notice for a severe start whose activation mark is on.
   *
   * @param outcome How the start ended.
   * @param notices The window notices, or null when they do not exist yet.
   */
  public notify(outcome: BootOutcome, notices: Pick<Notices, 'once'> | null): void {
    if (outcome !== 'active' || !this.#severe || !this.#started.includes(MARKING_MODULE)) {
      return;
    }
    notices?.once(BOOT_NOTICE_KEY, bootNoticeText(this.#failed.length, this.#tried), 'error');
  }

  get #severe(): boolean {
    return this.#failed.length >= SEVERE_FAILURES;
  }

  get #tried(): number {
    return this.#started.length + this.#failed.length;
  }

  get #undefinedCount(): number {
    return this.#catalog?.undefinedNames.length ?? 0;
  }

  #level(outcome: BootOutcome): 'info' | 'warn' | 'error' {
    if (outcome === 'failed' || (outcome === 'active' && this.#severe)) {
      return 'error';
    }
    const problems = this.#failed.length + this.#invalid.length + this.#undefinedCount;
    return outcome === 'inactive' || problems > 0 ? 'warn' : 'info';
  }

  #line(outcome: BootOutcome): string {
    const result = outcome === 'failed' ? `failed at ${this.#stage}` : outcome;
    const ids = this.#failed.length > 0 ? `: ${this.#failed.join(', ')}` : '';
    const { config, window } = this.#skipped;
    return (
      `self-check: ${result}, ${this.#started.length} of ${this.#tried} modules started, ` +
      `${this.#failed.length} failed${ids} (${this.#versions()}); ` +
      `off: ${config} in config, ${window} for this window, ${this.#invalid.length} by options; ` +
      `undefined selectors: ${this.#undefinedCount}`
    );
  }

  #versions(): string {
    const vivarcdi = this.#build?.vivarcdiVersion ?? UNKNOWN;
    const vivaldi = this.#build?.vivaldiVersion ?? UNKNOWN;
    const selectors = this.#catalog === null ? UNKNOWN : (this.#catalog.version ?? NONE);
    return `VivArcDi ${vivarcdi}, Vivaldi ${vivaldi}, selectors ${selectors}`;
  }
}
