import type { Logger } from '../support/Logger.js';

export interface ShapeProbe {
  /** The key under which the probe is kept; a second probe with the same name replaces the first. */
  readonly name: string;
  /** What the probe expects of Vivaldi's interface, in words, for the warning. */
  readonly expects: string;
  /** Whether the interface still has the shape. */
  holds(): boolean;
}

export interface ShapeFinding {
  readonly name: string;
  readonly expects: string;
}

export interface ShapeBoard {
  /** Registers a probe that the start runs once after the modules. */
  add(probe: ShapeProbe): void;
  /** Warns once per key that a shape of Vivaldi's interface is missing at first use. */
  report(key: string, expects: string): void;
}

export class ShapeGuards implements ShapeBoard {
  #logger: Pick<Logger, 'warn'>;
  #probes = new Map<string, ShapeProbe>();
  #reported = new Set<string>();

  /**
   * Keeps the probes of the couplings to Vivaldi's interface and the first-use reports. It holds
   * no DOM, timer or storage.
   *
   * @param logger The logger that the first-use warning goes to.
   */
  constructor(logger: Pick<Logger, 'warn'>) {
    this.#logger = logger;
  }

  /**
   * @param probe The probe to keep; one with the same name is replaced.
   */
  public add(probe: ShapeProbe): void {
    this.#probes.set(probe.name, probe);
  }

  /**
   * @param key What the report is about; a key reports once until the window reloads.
   * @param expects What is missing, in words.
   */
  public report(key: string, expects: string): void {
    if (this.#reported.has(key)) {
      return;
    }
    this.#reported.add(key);
    this.#logger.warn(`Vivaldi UI shape: ${expects}`);
  }

  /**
   * Runs every probe once, in the order of registration. It never throws and logs nothing.
   *
   * @returns One finding for each probe that fails or throws.
   */
  public run(): ShapeFinding[] {
    const findings: ShapeFinding[] = [];
    for (const probe of this.#probes.values()) {
      if (!ShapeGuards.#holds(probe)) {
        findings.push({ name: probe.name, expects: probe.expects });
      }
    }
    return findings;
  }

  static #holds(probe: ShapeProbe): boolean {
    try {
      return probe.holds();
    } catch {
      return false;
    }
  }
}
