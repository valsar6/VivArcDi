import { Module } from "../../core/Module.js";
import { LITTLE_ARC_DEFAULTS, settingsFrom } from "./LittleArcSettings.js";
import { LittleArcRegistry } from "./LittleArcRegistry.js";
import { MainWindowRole } from "./MainWindowRole.js";
import { PopupWindowRole } from "./PopupWindowRole.js";
class LittleArc extends Module {
  static id = "little-arc";
  static privateWindows = "never";
  /**
   * Options accepted in `config.json`, with their defaults.
   */
  static defaults = LITTLE_ARC_DEFAULTS;
  #role = null;
  /**
   * Little Arc: a small, minimal window for a quick lookup. In a normal window the module opens it on
   * Cmd+Opt+N (Ctrl+Alt+N) and for links opened from other apps, and takes a kept page into the window.
   * In a Little Arc window it draws the compact bar. Without `chrome.tabs` or `chrome.windows` the
   * module stays off and Vivaldi handles links as usual.
   *
   * @param context What the module may use.
   */
  async start(context) {
    if (!context.tabs.available || !context.windows.available) {
      context.logger.warn("chrome.tabs or chrome.windows is missing: Little Arc is off");
      return;
    }
    const current = await context.windows.current();
    if (current.id === void 0) {
      context.logger.warn("this window has no id: Little Arc is off");
      return;
    }
    const settings = settingsFrom(context.options);
    const registry = new LittleArcRegistry(context.storage);
    const Role = current.type === "popup" ? PopupWindowRole : MainWindowRole;
    this.#role = new Role(context, settings, registry, current.id);
    await this.#role.start();
  }
  /**
   * Removes every listener and the bar.
   */
  stop() {
    this.#role?.stop();
    this.#role = null;
  }
  /**
   * Reads the options of `config.json`, keeping sizes within 20 to 100 percent.
   *
   * @param options The module's options.
   * @returns Complete settings.
   */
  static settingsFrom(options) {
    return settingsFrom(options);
  }
}
export {
  LittleArc
};
