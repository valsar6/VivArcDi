class ModuleSettings {
  #values;
  #all;
  constructor(values, all) {
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
  static check(section, schemas, logger) {
    const values = /* @__PURE__ */ new Map();
    const all = {};
    for (const [id, entry] of Object.entries(section)) {
      const schema = schemas.schemaOf(id);
      if (schema === void 0) {
        continue;
      }
      const raw = ModuleSettings.#sectionOf(entry);
      const moduleLogger = logger.child(id);
      ModuleSettings.#checkEnabled(raw, moduleLogger);
      const checked = schema.check(raw, moduleLogger);
      values.set(id, checked);
      all[id] = Object.freeze({ ...checked, enabled: raw["enabled"] === true && checked !== null });
    }
    return new ModuleSettings(values, Object.freeze(all));
  }
  /**
   * @returns The checked settings of every registered module, with `enabled` as a boolean, for
   *   modules that follow another one.
   */
  get all() {
    return this.#all;
  }
  /**
   * @param id A module id.
   * @returns The module's checked options, or null when a required option is missing.
   */
  optionsOf(id) {
    return this.#values.get(id) ?? null;
  }
  static #sectionOf(entry) {
    return typeof entry === "object" && entry !== null && !Array.isArray(entry) ? entry : {};
  }
  static #checkEnabled(raw, logger) {
    const enabled = raw["enabled"];
    if (enabled !== void 0 && typeof enabled !== "boolean") {
      logger.warn(`"enabled" is ${String(JSON.stringify(enabled))}, not true or false: the module stays off`);
    }
  }
}
export {
  ModuleSettings
};
