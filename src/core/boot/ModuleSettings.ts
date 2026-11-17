import type { Logger } from '../support/Logger.js';
import { OptionSchema } from './options/OptionSchema.js';
import type { ModuleOptions } from './types.js';

export interface SchemaSource {
  /**
   * @param id A module id.
   * @returns The option schema of the module registered under that id, if any.
   */
  schemaOf(id: string): OptionSchema<object> | undefined;
}

type Values = Readonly<Record<string, unknown>>;

/**
 * The `modules` section of `config.json`, checked against the option schema of each registered
 * module. Warnings go to the logger of the module they concern.
 */
export class ModuleSettings {
  readonly #values: ReadonlyMap<string, Values | null>;
  readonly #all: Readonly<Record<string, ModuleOptions>>;

  private constructor(values: ReadonlyMap<string, Values | null>, all: Readonly<Record<string, ModuleOptions>>) {
    this.#values = values;
    this.#all = all;
  }

  /**
   * Checks the section of every registered module named in `config.json`, enabled or not.
   *
   * @param section The `modules` section of `config.json`.
   * @param schemas Where the schemas come from, usually the module registry.
   * @param logger The VivArcDi logger; each module gets a child named after its id.
   * @returns The checked settings.
   */
  public static check(section: Readonly<Record<string, unknown>>, schemas: SchemaSource, logger: Logger): ModuleSettings {
    const values = new Map<string, Values | null>();
    const all: Record<string, ModuleOptions> = {};
    for (const [id, entry] of Object.entries(section)) {
      const schema = schemas.schemaOf(id);
      if (schema === undefined) {
        continue;
      }
      const raw = ModuleSettings.#sectionOf(entry);
      const moduleLogger = logger.child(id);
      ModuleSettings.#checkEnabled(raw, moduleLogger);
      const checked = schema === OptionSchema.none ? ModuleSettings.#withoutEnabled(raw) : (schema.check(raw, moduleLogger) as Values | null);
      values.set(id, checked);
      all[id] = Object.freeze({ ...checked, enabled: raw['enabled'] === true && checked !== null });
    }
    return new ModuleSettings(values, Object.freeze(all));
  }

  /**
   * @returns The checked settings of every registered module, with `enabled` as a boolean, for
   *   modules that follow another one.
   */
  public get all(): Readonly<Record<string, ModuleOptions>> {
    return this.#all;
  }

  /**
   * @param id A module id.
   * @returns The module's checked options, or null when a required option is missing.
   */
  public optionsOf(id: string): Values | null {
    return this.#values.get(id) ?? null;
  }

  static #sectionOf(entry: unknown): Values {
    return typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? (entry as Values) : {};
  }

  static #checkEnabled(raw: Values, logger: Logger): void {
    const enabled = raw['enabled'];
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      logger.warn(`"enabled" is ${String(JSON.stringify(enabled))}, not true or false: the module stays off`);
    }
  }

  static #withoutEnabled(raw: Values): Values {
    return Object.freeze(Object.fromEntries(Object.entries(raw).filter(([name]) => name !== 'enabled')));
  }
}
