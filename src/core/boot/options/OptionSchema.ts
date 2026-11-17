import type { Logger } from '../../support/Logger.js';
import type { Option } from './Option.js';

type OptionKinds = Readonly<Record<string, Option<unknown>>>;

type ValuesOf<K extends OptionKinds> = { readonly [P in keyof K]: K[P] extends Option<infer T> ? T : never };

/** The values that a schema hands to its module. */
export type OptionValues<S> = S extends OptionSchema<infer T> ? T : never;

export type OptionWarnings = Pick<Logger, 'warn'>;

const ENABLED = 'enabled';
const SILENT: OptionWarnings = { warn: (): void => undefined };

/**
 * The options of one module: their kinds and defaults. Checks a section of `config.json` and
 * replaces every value it refuses with the default.
 */
export class OptionSchema<T extends object> {
  /** The schema of a module without options. */
  public static readonly none = new OptionSchema<Readonly<Record<string, never>>>({});

  readonly #kinds: OptionKinds;

  private constructor(kinds: OptionKinds) {
    this.#kinds = kinds;
  }

  /**
   * @param kinds The options by name.
   * @returns A schema whose values have the types of the options.
   */
  public static of<K extends OptionKinds>(kinds: K): OptionSchema<ValuesOf<K>> {
    return new OptionSchema<ValuesOf<K>>(kinds);
  }

  /**
   * @returns The values a module gets from an empty section.
   * @throws {Error} When the schema has a required option.
   */
  public get defaults(): T {
    const values = this.check({}, SILENT);
    if (values === null) {
      throw new Error('a schema with a required option has no defaults');
    }
    return values;
  }

  /**
   * Checks a module's section of `config.json`. Logs one warning for each refused value, unknown
   * option and missing required option. The key `enabled` belongs to the registry and is skipped.
   *
   * @param raw The section as written in `config.json`.
   * @param warnings The module's logger.
   * @returns Every option with an accepted value or its default, or null when a required option is
   *   missing or refused.
   */
  public check(raw: Readonly<Record<string, unknown>>, warnings: OptionWarnings): T | null {
    const values: Record<string, unknown> = {};
    let complete = true;
    for (const [name, kind] of Object.entries(this.#kinds)) {
      const value = OptionSchema.#valueOf(raw, name);
      const accepted = value === undefined ? undefined : kind.read(value);
      if (accepted !== undefined) {
        values[name] = accepted;
      } else if (kind.required) {
        complete = false;
        warnings.warn(value === undefined
          ? `option "${name}" is required and missing: the module stays off`
          : `option "${name}" is ${OptionSchema.#show(value)}, not ${kind.describe()}: the module stays off`);
      } else {
        values[name] = kind.fallback;
        if (value !== undefined) {
          warnings.warn(`option "${name}" is ${OptionSchema.#show(value)}, not ${kind.describe()}: using ${OptionSchema.#show(kind.fallback)}`);
        }
      }
    }
    Object.keys(raw)
      .filter((name) => name !== ENABLED && !Object.hasOwn(this.#kinds, name))
      .forEach((name) => warnings.warn(`option "${name}" is not known: ignored`));
    return complete ? (Object.freeze(values) as T) : null;
  }

  static #valueOf(raw: Readonly<Record<string, unknown>>, name: string): unknown {
    return Object.hasOwn(raw, name) ? raw[name] : undefined;
  }

  static #show(value: unknown): string {
    return JSON.stringify(value) ?? String(value);
  }
}
