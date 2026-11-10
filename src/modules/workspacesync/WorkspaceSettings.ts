import type { Logger } from '../../core/Logger.js';
import { SyncNames } from './SyncNames.js';
import type { SyncStore } from './SyncStore.js';

export class WorkspaceSettings {
  #store: Pick<SyncStore, 'spaces' | 'writeSettings'>;
  #logger: Logger;
  #warned = false;

  /**
   * The settings a workspace owns in VivArcDi, kept in the sync store so they follow the workspace
   * to the other computers. Each key holds one JSON value, and the last write of a key wins. The
   * specs that use a setting own its key, such as the theme color of 019.
   *
   * @param store The sync store.
   * @param logger Logger for settings that cannot be read.
   */
  constructor(store: Pick<SyncStore, 'spaces' | 'writeSettings'>, logger: Logger) {
    this.#store = store;
    this.#logger = logger;
  }

  /**
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param key The name of the setting.
   * @returns Its value, or undefined when it was never set.
   */
  public async get(workspaceName: string | null, key: string): Promise<unknown> {
    return (await this.#all(workspaceName))[key];
  }

  /**
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param key The name of the setting.
   * @param value A JSON value; the store is written only when it differs from the stored one.
   */
  public async set(workspaceName: string | null, key: string, value: unknown): Promise<void> {
    const settings = await this.#all(workspaceName);
    if (JSON.stringify(settings[key]) !== JSON.stringify(value)) {
      await this.#store.writeSettings(workspaceName, JSON.stringify({ ...settings, [key]: value }));
    }
  }

  async #all(workspaceName: string | null): Promise<Record<string, unknown>> {
    const text = (await this.#store.spaces()).get(SyncNames.folderOf(workspaceName))?.settings ?? null;
    if (text === null) {
      return {};
    }
    const settings = WorkspaceSettings.#parse(text);
    if (settings === null) {
      this.#warnOnce();
    }
    return settings ?? {};
  }

  static #parse(text: string): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  #warnOnce(): void {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn('the settings in the sync store are not valid JSON and are ignored');
    }
  }
}
