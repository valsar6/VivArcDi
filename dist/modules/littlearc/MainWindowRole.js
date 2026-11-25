import { WorkspaceNames } from "../../core/workspaces/WorkspaceNames.js";
import { PageScriptInjector } from "../../core/browser/PageScriptInjector.js";
import { DomQuery } from "../../core/dom/DomQuery.js";
import { ShortcutKeys } from "../../core/dom/ShortcutKeys.js";
import { WindowKeys } from "../../core/dom/WindowKeys.js";
import { KeptTab } from "../../shared/tabs/KeptTab.js";
import { DestinationPalette } from "./DestinationPalette.js";
import { DestinationPicker } from "./DestinationPicker.js";
import { ExternalLinkDetector } from "./ExternalLinkDetector.js";
import { DETECTION_DELAY_MS, ExternalLinkWatcher } from "./ExternalLinkWatcher.js";
import { FocusHistory } from "./FocusHistory.js";
import { LittleArcIndicator } from "./LittleArcIndicator.js";
import { LittleArcLauncher } from "./LittleArcLauncher.js";
import { isDestinationQuestion, parseAdoptMessage, parsePageLinkMessage } from "./LittleArcMessage.js";
import { screenOf } from "./ScreenAreas.js";
import { assembleCommandBar } from "./commandbar/CommandBarAssembly.js";
import { WorkspaceAdopter } from "./WorkspaceAdopter.js";
const LINK_SCRIPT_PATH = "page/little-arc-links.js";
const LINK_SCRIPT_GLOBAL = "VivArcDiLittleArcLinks";
class MainWindowRole {
  #context;
  #settings;
  #registry;
  #windowId;
  #launcher;
  #indicator;
  #cleanups = [];
  #token = crypto.randomUUID();
  #keptTabs = /* @__PURE__ */ new Map();
  /**
   * What Little Arc does in a normal window: opens the small window on Cmd+Opt+N, moves links that
   * come from other apps into it, and takes a page kept from it into this window.
   *
   * @param context What the module may use.
   * @param settings The module's settings.
   * @param registry Remembers which windows are Little Arc windows.
   * @param windowId The id of this window.
   */
  constructor(context, settings, registry, windowId) {
    this.#context = context;
    this.#settings = settings;
    this.#registry = registry;
    this.#windowId = windowId;
    this.#launcher = new LittleArcLauncher({
      windows: context.windows,
      registry,
      screen: () => screenOf(context.document),
      size: settings,
      logger: context.logger
    });
    this.#indicator = new LittleArcIndicator({ ...context, logger: context.logger.child("LittleArcIndicator") });
  }
  /**
   * Starts listening for the shortcut, for moved pages and, when enabled, for links from other apps.
   */
  async start() {
    const bar = this.#commandBar();
    const keys = new WindowKeys(
      this.#context.document,
      (event) => ShortcutKeys.isCommandOption(event, "KeyN") ? "open" : null,
      () => this.#open(bar)
    );
    keys.attach();
    this.#cleanups.push(() => keys.detach());
    this.#cleanups.push(this.#indicator.start());
    await this.#listenForPages();
    await this.#listenForKeptLinks();
    if (this.#settings.externalLinks) {
      this.#listenForExternalLinks();
    }
    if (this.#settings.askWorkspace) {
      this.#context.logger.warn("askWorkspace is not available yet: the most recent workspace is used");
    }
  }
  /**
   * Removes every listener.
   */
  stop() {
    this.#cleanups.forEach((cleanup) => cleanup());
    this.#cleanups = [];
  }
  #commandBar() {
    if (!this.#settings.commandBar) {
      return null;
    }
    try {
      const bar = assembleCommandBar(this.#context, this.#launcher, this.#registry, this.#windowId);
      this.#cleanups.push(() => bar.stop());
      return bar;
    } catch (error) {
      this.#context.logger.warn("cannot set up the command bar: the shortcut opens the blank window", error);
      return null;
    }
  }
  #open(bar) {
    if (bar?.toggle() !== true) void this.#launcher.openBlank();
  }
  async #listenForPages() {
    const { tabs, windows, runtime, logger } = this.#context;
    if (!runtime.messagesAvailable) {
      logger.warn("chrome.runtime.onMessage is missing: pages cannot be moved from Little Arc");
      return;
    }
    const workspace = this.#context.activeWorkspace;
    const picker = new DestinationPicker(this.#settings.askWorkspace, () => Promise.resolve(null));
    const destination = await this.#destinationSource();
    const adopter = new WorkspaceAdopter({ tabs, windows, windowId: this.#windowId, recentWorkspace: () => workspace.current, picker, destination, logger });
    this.#cleanups.push(runtime.onMessage((message) => this.#handle(adopter, message)));
  }
  async #destinationSource() {
    const { prefs, document, selectors, logger } = this.#context;
    const names = new WorkspaceNames(prefs, () => void 0, logger);
    await names.start().catch((error) => logger.warn("cannot read the names of the workspaces", error));
    this.#cleanups.push(() => names.stop());
    const root = () => document.querySelector(selectors.get("browser"));
    return { nameOf: (workspace) => names.nameOf(workspace), colors: () => DestinationPalette.read(root()) };
  }
  #handle(adopter, message) {
    const request = parseAdoptMessage(message);
    if (request !== null) {
      void adopter.adopt(request);
      return;
    }
    if (isDestinationQuestion(message)) {
      void this.#answer(adopter);
      return;
    }
    void this.#handleLink(message);
  }
  async #listenForKeptLinks() {
    const { document, selectors, tabs, runtime, payload, logger } = this.#context;
    let container;
    let script;
    try {
      container = DomQuery.require(document, selectors.get("webviewContainer"));
      script = await payload.text(LINK_SCRIPT_PATH);
    } catch (error) {
      logger.warn("cannot follow the pages of the tabs: new-window links stay with Vivaldi", error);
      return;
    }
    const injector = new PageScriptInjector({
      container,
      webviewSelector: selectors.get("tabWebview"),
      scriptFor: async (tabId) => this.#linkScript(script, tabId),
      uninstallScript: `globalThis.${LINK_SCRIPT_GLOBAL}?.uninstall();`,
      purpose: "Little Arc links",
      onConsoleMessage: (message) => void this.#handleLink(message),
      errors: runtime,
      logger
    });
    injector.attach();
    this.#cleanups.push(() => injector.detach());
    this.#cleanups.push(
      tabs.onUpdated((tabId, change, tab) => {
        const kept = KeptTab.is(tab);
        if ((change.pinned !== void 0 || "vivExtData" in change) && this.#keptTabs.get(tabId) !== kept) {
          this.#keptTabs.set(tabId, kept);
          injector.refresh(tabId);
        }
      })
    );
  }
  async #linkScript(script, tabId) {
    const tab = await this.#context.tabs.get(tabId);
    return KeptTab.is(tab) ? `${script}
${LINK_SCRIPT_GLOBAL}.install(${JSON.stringify({ token: this.#token, tabId })});` : null;
  }
  async #handleLink(value) {
    const link = parsePageLinkMessage(value);
    if (link === null || link.token !== this.#token) {
      return;
    }
    try {
      const tab = await this.#context.tabs.get(link.tabId);
      if (KeptTab.is(tab)) {
        const windowId = await this.#launcher.openAddressIn(link.url);
        if (windowId !== null) await this.#indicator.show(link.tabId, windowId, link.url);
      }
    } catch (error) {
      this.#context.logger.warn("could not read the tab of a Little Arc link", error);
    }
  }
  async #answer(adopter) {
    const answer = await adopter.describeDestination();
    if (answer !== null) await this.#context.runtime.sendMessage(answer).catch((error) => this.#context.logger.warn("could not answer the Little Arc bar", error));
  }
  #listenForExternalLinks() {
    const { tabs, windows, logger } = this.#context;
    try {
      const history = new FocusHistory();
      const detector = new ExternalLinkDetector(history, (id) => this.#registry.has(id));
      const watcher = new ExternalLinkWatcher(tabs, detector, this.#launcher, logger);
      this.#cleanups.push(windows.onFocusChanged((id) => history.record(id)));
      this.#cleanups.push(tabs.onCreated((tab) => this.#watch(watcher, tab)));
    } catch (error) {
      logger.warn("cannot follow new tabs or window focus: links from other apps stay in the main window", error);
    }
  }
  #watch(watcher, tab) {
    if (tab.id === void 0 || tab.windowId !== this.#windowId) {
      return;
    }
    const { id } = tab;
    const createdAt = Date.now();
    const timer = setTimeout(() => void watcher.check(id, createdAt), DETECTION_DELAY_MS);
    this.#cleanups.push(() => clearTimeout(timer));
  }
}
export {
  MainWindowRole
};
