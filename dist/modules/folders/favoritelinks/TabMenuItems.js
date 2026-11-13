import { MenuItemShape } from "./MenuItemShape.js";
import { TabSlot } from "../../../core/tabs/TabSlot.js";
const MAX_AGE_MS = 1e3;
class TabMenuItems {
  #deps;
  #original = null;
  #wrapper = null;
  #pressed = null;
  #pending = null;
  #warned = false;
  #onContext = (event) => this.#context(event);
  #onActivated = (...values) => void this.#activated(values);
  /**
   * Adds commands to Vivaldi's menu of a tab. Vivaldi builds that menu itself and shows it with
   * `vivaldi.contextMenu.show`, so the call is wrapped: a right click on a tab slot is remembered,
   * and the `show` that follows gets a separator and the commands after its own items, in the
   * shape of its own items, without delaying the call. When the activation reports one of the ids,
   * the tab is read and the command runs if it applies to it; any other id goes to Vivaldi as
   * before. Every other call of `show` passes through unchanged. Where the API or the shape of its
   * items is not as expected, nothing is added and the reason is logged once.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Wraps `show` and starts remembering the tab under a right click.
   */
  start() {
    const { contextMenu, document, logger } = this.#deps;
    if (typeof contextMenu?.show !== "function") {
      logger.warn("vivaldi.contextMenu.show is missing: Pin tab and Tile tab stay on Cmd/Ctrl+D and the drags");
      return;
    }
    const original = contextMenu.show;
    const wrapper = (...args) => this.#show(original, contextMenu, args);
    this.#original = original;
    this.#wrapper = wrapper;
    contextMenu.show = wrapper;
    document.addEventListener("contextmenu", this.#onContext, true);
    this.#listen("addListener");
  }
  /**
   * Restores `show` and stops listening.
   */
  stop() {
    const { contextMenu, document } = this.#deps;
    if (this.#original === null || contextMenu === void 0) {
      return;
    }
    if (contextMenu.show === this.#wrapper) {
      contextMenu.show = this.#original;
    }
    document.removeEventListener("contextmenu", this.#onContext, true);
    this.#listen("removeListener");
    this.#original = null;
    this.#wrapper = null;
    this.#pressed = null;
    this.#pending = null;
  }
  #listen(method) {
    const event = this.#deps.contextMenu?.onActivated;
    const register = event?.[method];
    if (typeof register === "function") {
      register.call(event, this.#onActivated);
    }
  }
  #context(event) {
    const target = event.target;
    const tabId = target?.closest?.(this.#deps.wrapperSelector) == null ? null : TabSlot.idOf(target, this.#deps.wrapperSelector);
    this.#pressed = tabId === null ? null : { tabId, at: (this.#deps.now ?? Date.now)() };
  }
  #show(original, host, args) {
    const pressed = this.#pressed;
    this.#pressed = null;
    if (pressed === null || (this.#deps.now ?? Date.now)() - pressed.at > MAX_AGE_MS) {
      return original.apply(host, args);
    }
    return original.apply(host, this.#extend(args, pressed.tabId));
  }
  #extend(args, tabId) {
    const [params, ...rest] = args;
    const found = params?.items;
    const items = Array.isArray(found) ? found : [];
    const shape = Array.isArray(found) ? MenuItemShape.from(items) : null;
    if (shape === null) {
      this.#warnOnce("the items of vivaldi.contextMenu.show are not as expected: no command was added to the menu of the tab");
      return args;
    }
    const separator = shape.separator();
    const added = this.#deps.commands.map(({ id, label }) => shape.command(id, label));
    this.#pending = tabId;
    return [{ ...params, items: [...items, ...separator === null ? [] : [separator], ...added] }, ...rest.map((arg) => this.#follow(arg))];
  }
  #follow(arg) {
    if (typeof arg !== "function") {
      return arg;
    }
    return (...values) => this.#activated(values) ? void 0 : arg(...values);
  }
  #activated(values) {
    const ids = values.map((value) => MenuItemShape.idIn(value));
    const command = this.#deps.commands.find((candidate) => ids.includes(candidate.id));
    const tabId = this.#pending;
    if (command === void 0) {
      return false;
    }
    this.#pending = null;
    if (tabId !== null) {
      this.#run(command, tabId).catch((error) => this.#deps.logger.warn(`could not run "${command.label}" from the menu of a tab`, error));
    }
    return true;
  }
  async #run(command, tabId) {
    const tab = await this.#deps.tabs.get(tabId);
    if (this.#deps.appliesTo(tab)) {
      await command.run(tab);
    } else {
      this.#deps.logger.warn(`"${command.label}" does not apply to this tab`);
    }
  }
  #warnOnce(message) {
    if (!this.#warned) {
      this.#warned = true;
      this.#deps.logger.warn(message);
    }
  }
}
export {
  TabMenuItems
};
