import { SyncNames } from "./SyncNames.js";
class WorkspaceSettings {
  #store;
  #logger;
  #warned = false;
  /**
   * The settings a workspace owns in VivArcDi, kept in the sync store so they follow the workspace
   * to the other computers. Each key holds one JSON value, and the last write of a key wins. The
   * specs that use a setting own its key, such as the theme color of 019.
   *
   * @param store The sync store.
   * @param logger Logger for settings that cannot be read.
   */
  constructor(store, logger) {
    this.#store = store;
    this.#logger = logger;
  }
  /**
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param key The name of the setting.
   * @returns Its value, or undefined when it was never set.
   */
  async get(workspaceName, key) {
    return (await this.#all(workspaceName))[key];
  }
  /**
   * @param workspaceName The workspace name, or null for the area outside any workspace.
   * @param key The name of the setting.
   * @param value A JSON value; the store is written only when it differs from the stored one.
   */
  async set(workspaceName, key, value) {
    const settings = await this.#all(workspaceName);
    if (JSON.stringify(settings[key]) !== JSON.stringify(value)) {
      await this.#store.writeSettings(workspaceName, JSON.stringify({ ...settings, [key]: value }));
    }
  }
  async #all(workspaceName) {
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
  static #parse(text) {
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  #warnOnce() {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger.warn("the settings in the sync store are not valid JSON and are ignored");
    }
  }
}
export {
  WorkspaceSettings
};
