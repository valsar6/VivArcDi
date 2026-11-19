import type { Module, PrivateWindowPolicy } from './Module.js';
import type { OptionSchema } from './options/OptionSchema.js';
import type { SchemaSource } from './ModuleSettings.js';
import type { ModuleOptions } from './types.js';

export interface EnabledModule {
  /** The module id. */
  id: string;
  /** A new instance of the module. */
  module: Module;
}

export interface ModuleClass {
  new (): Module;
  id: string;
  options: OptionSchema<object>;
  name: string;
  privateWindows: PrivateWindowPolicy;
}

export interface SkippedModules {
  /** Registered modules named in `config.json` whose `enabled` is not `true`. */
  config: number;
  /** Enabled modules whose `privateWindows` policy does not fit the window. */
  window: number;
}

const FITS: Record<PrivateWindowPolicy, (privateWindow: boolean) => boolean> = {
  never: (privateWindow) => !privateWindow,
  allowed: () => true,
  only: (privateWindow) => privateWindow,
};

export class ModuleRegistry implements SchemaSource {
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
   * @param id Module id.
   * @returns The option schema of the module registered under that id, if any.
   */
  public schemaOf(id: string): OptionSchema<object> | undefined {
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
  public createEnabled(settings: Record<string, ModuleOptions>, privateWindow = false): {
    modules: EnabledModule[];
    unknown: string[];
    skipped: SkippedModules;
  } {
    const modules: EnabledModule[] = [];
    const unknown: string[] = [];
    const skipped: SkippedModules = { config: 0, window: 0 };
    for (const [id, options] of Object.entries(settings)) {
      const moduleClass = this.#classes.get(id);
      const enabled = options?.enabled === true;
      if (moduleClass === undefined) {
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
