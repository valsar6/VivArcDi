/**
 * @typedef {object} EnabledModule
 * @property {string} id The module id.
 * @property {import('./Module.js').Module} module A new instance of the module.
 * @property {Record<string, unknown>} options The module's options from `config.json`.
 */

export class ModuleRegistry {
  #classes = new Map();

  /**
   * Makes a module class available under its static `id`.
   *
   * @param {typeof import('./Module.js').Module} ModuleClass The module class.
   * @returns {ModuleRegistry} This registry, for chaining.
   * @throws {Error} When the id is empty or already registered.
   */
  register(ModuleClass) {
    const { id } = ModuleClass;
    if (!id) {
      throw new Error(`${ModuleClass.name} has no static id`);
    }
    if (this.#classes.has(id)) {
      throw new Error(`Module "${id}" is already registered`);
    }
    this.#classes.set(id, ModuleClass);
    return this;
  }

  /**
   * @param {string} id Module id.
   * @returns {boolean} Whether a module is registered under that id.
   */
  has(id) {
    return this.#classes.has(id);
  }

  /**
   * Creates an instance of every module that `config.json` enables.
   *
   * @param {Record<string, { enabled?: boolean } & Record<string, unknown>>} settings The `modules` section of `config.json`.
   * @returns {{ modules: EnabledModule[], unknown: string[] }} The new instances, and the enabled ids that no module matches.
   */
  createEnabled(settings) {
    const modules = [];
    const unknown = [];
    for (const [id, options] of Object.entries(settings)) {
      if (!options?.enabled) {
        continue;
      }
      if (!this.has(id)) {
        unknown.push(id);
        continue;
      }
      const ModuleClass = this.#classes.get(id);
      modules.push({ id, module: new ModuleClass(), options });
    }
    return { modules, unknown };
  }
}
