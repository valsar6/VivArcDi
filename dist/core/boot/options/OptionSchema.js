const ENABLED = "enabled";
const SILENT = { warn: () => void 0 };
class OptionSchema {
  /** The schema of a module without options. */
  static none = new OptionSchema({});
  #kinds;
  constructor(kinds) {
    this.#kinds = kinds;
  }
  /**
   * @param kinds The options by name.
   * @returns A schema whose values have the types of the options.
   */
  static of(kinds) {
    return new OptionSchema(kinds);
  }
  /**
   * @returns The values a module gets from an empty section.
   * @throws {Error} When the schema has a required option.
   */
  get defaults() {
    const values = this.check({}, SILENT);
    if (values === null) {
      throw new Error("a schema with a required option has no defaults");
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
  check(raw, warnings) {
    const values = {};
    let complete = true;
    for (const [name, kind] of Object.entries(this.#kinds)) {
      const value = OptionSchema.#valueOf(raw, name);
      const accepted = value === void 0 ? void 0 : kind.read(value);
      if (accepted !== void 0) {
        values[name] = accepted;
      } else if (kind.required) {
        complete = false;
        warnings.warn(value === void 0 ? `option "${name}" is required and missing: the module stays off` : `option "${name}" is ${OptionSchema.#show(value)}, not ${kind.describe()}: the module stays off`);
      } else {
        values[name] = kind.fallback;
        if (value !== void 0) {
          warnings.warn(`option "${name}" is ${OptionSchema.#show(value)}, not ${kind.describe()}: using ${OptionSchema.#show(kind.fallback)}`);
        }
      }
    }
    Object.keys(raw).filter((name) => name !== ENABLED && !Object.hasOwn(this.#kinds, name)).forEach((name) => warnings.warn(`option "${name}" is not known: ignored`));
    return complete ? Object.freeze(values) : null;
  }
  static #valueOf(raw, name) {
    return Object.hasOwn(raw, name) ? raw[name] : void 0;
  }
  static #show(value) {
    return JSON.stringify(value) ?? String(value);
  }
}
export {
  OptionSchema
};
