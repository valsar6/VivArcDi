class ModuleRegistry {
  #classes = /* @__PURE__ */ new Map();
  /**
   * Makes a module class available under its static `id`.
   *
   * @param moduleClass The module class.
   * @returns This registry, for chaining.
   * @throws {Error} When the id is empty or already registered.
   */
  register(moduleClass) {
    const { id } = moduleClass;
    if (!id) {
      throw new Error(`${moduleClass.name} has no static id`);
    }
    if (this.#classes.has(id)) {
      throw new Error(`Module "${id}" is already registered`);
    }
    this.#classes.set(id, moduleClass);
    return this;
  }
  /**
   * @param id Module id.
   * @returns Whether a module is registered under that id.
   */
  has(id) {
    return this.#classes.has(id);
  }
  /**
   * Creates an instance of every module that `config.json` enables.
   *
   * @param settings The `modules` section of `config.json`.
   * @returns The new instances, and the enabled ids that no module matches.
   */
  createEnabled(settings) {
    const modules = [];
    const unknown = [];
    for (const [id, options] of Object.entries(settings)) {
      if (!options?.enabled) {
        continue;
      }
      const moduleClass = this.#classes.get(id);
      if (moduleClass === void 0) {
        unknown.push(id);
        continue;
      }
      modules.push({ id, module: new moduleClass(), options });
    }
    return { modules, unknown };
  }
}
export {
  ModuleRegistry
};
