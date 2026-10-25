export type ModuleOptions = { enabled?: boolean } & Record<string, unknown>;

export interface Config {
  styles: string[];
  modules: Record<string, ModuleOptions>;
}

export interface BuildInfo {
  vivarcdiVersion: string;
  vivaldiVersion: string;
}

export interface SelectorIndex {
  versions: string[];
}
