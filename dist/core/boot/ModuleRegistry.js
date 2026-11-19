const FITS = {
  never: (privateWindow) => !privateWindow,
  allowed: () => true,
  only: (privateWindow) => privateWindow
};
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
   * @param id Module id.
   * @returns The option schema of the module registered under that id, if any.
   */
  schemaOf(id) {
    return this.#classes.get(id)?.options;
  }
  /**
   * Creates an instance of every module whose `enabled` is `true` in `config.json`.
   *
   * Modules whose `privateWindows` policy does not fit the kind of window are left out.
   *
   * @param settings The `modules` section of `config.json`.
   * @param privateWindow Whether the window is a private window.
   * @returns The new instances, the enabled ids that no module matches, and how many registered
   * modules were left out because of `config.json` or because of the window.
   */
  createEnabled(settings, privateWindow = false) {
    const modules = [];
    const unknown = [];
    const skipped = { config: 0, window: 0 };
    for (const [id, options] of Object.entries(settings)) {
      const moduleClass = this.#classes.get(id);
      const enabled = options?.enabled === true;
      if (moduleClass === void 0) {
        if (enabled) {
          unknown.push(id);
        }
        continue;
      }
      if (!enabled) {
        skipped.config += 1;
        continue;
      }
      if (!FITS[moduleClass.privateWindows](privateWindow)) {
        skipped.window += 1;
        continue;
      }
      modules.push({ id, module: new moduleClass() });
    }
    return { modules, unknown, skipped };
  }
}
export {
  ModuleRegistry
};
