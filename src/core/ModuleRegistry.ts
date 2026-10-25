import type { Module } from './Module.js';
import type { ModuleOptions } from './types.js';

export interface EnabledModule {
  /** The module id. */
  id: string;
  /** A new instance of the module. */
  module: Module;
  /** The module's options from `config.json`. */
  options: ModuleOptions;
}

export interface ModuleClass {
  new (): Module;
  id: string;
  name: string;
}

export class ModuleRegistry {
  #classes = new Map<string, ModuleClass>();

  /**
   * Makes a module class available under its static `id`.
   *
   * @param moduleClass The module class.
   * @returns This registry, for chaining.
   * @throws {Error} When the id is empty or already registered.
   */
  public register(moduleClass: ModuleClass): this {
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
  public has(id: string): boolean {
    return this.#classes.has(id);
  }

  /**
   * Creates an instance of every module that `config.json` enables.
   *
   * @param settings The `modules` section of `config.json`.
   * @returns The new instances, and the enabled ids that no module matches.
   */
  public createEnabled(settings: Record<string, ModuleOptions>): {
    modules: EnabledModule[];
    unknown: string[];
  } {
    const modules: EnabledModule[] = [];
    const unknown: string[] = [];
    for (const [id, options] of Object.entries(settings)) {
      if (!options?.enabled) {
        continue;
      }
      const moduleClass = this.#classes.get(id);
      if (moduleClass === undefined) {
        unknown.push(id);
        continue;
      }
      modules.push({ id, module: new moduleClass(), options });
    }
    return { modules, unknown };
  }
}
