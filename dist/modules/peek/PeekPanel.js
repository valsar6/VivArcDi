import { shortcutLabels } from "./PeekKeyMap.js";
const BACKDROP_CLASS = "vivarcdi-peek-backdrop";
const PANEL_CLASS = "vivarcdi-peek-panel";
const ACTIONS_CLASS = "vivarcdi-peek-actions";
const BUTTONS = [
  ["close", "Close", "\u2715"],
  ["expand", "Open as tab", "\u2197"],
  ["split", "Create split view", "\u25EB"]
];
class PeekPanel {
  #deps;
  #backdrop;
  #panel;
  #actions;
  #webview;
  #url;
  /**
   * The Peek: a dimmed backdrop over the page area and a rounded panel above it
   * that shows the real page in its own webview, with Close, Expand and Split buttons in a column beside it.
   *
   * @param url Address to show.
   * @param dependencies Everything the panel collaborates with.
   */
  constructor(url, dependencies) {
    this.#deps = dependencies;
    this.#url = url;
    this.#backdrop = this.#element("div", BACKDROP_CLASS);
    this.#backdrop.addEventListener("click", () => dependencies.onCommand("close"));
    this.#webview = this.#createWebview(url);
    this.#panel = this.#createPanel();
    this.#actions = this.#createActions();
    dependencies.container.append(this.#backdrop, this.#panel, this.#actions);
  }
  /**
   * @returns The address the panel shows now, after any navigation inside it.
   */
  get url() {
    return this.#url;
  }
  /**
   * Removes the panel and its page.
   */
  remove() {
    this.#backdrop.remove();
    this.#panel.remove();
    this.#actions.remove();
  }
  #createPanel() {
    const panel = this.#element("div", PANEL_CLASS);
    panel.style.setProperty("--vivarcdi-peek-width", `${this.#deps.size.widthPercent}%`);
    panel.style.setProperty("--vivarcdi-peek-height", `${this.#deps.size.heightPercent}%`);
    panel.append(this.#webview);
    return panel;
  }
  #createActions() {
    const actions = this.#element("div", ACTIONS_CLASS);
    actions.style.setProperty("--vivarcdi-peek-width", `${this.#deps.size.widthPercent}%`);
    actions.style.setProperty("--vivarcdi-peek-height", `${this.#deps.size.heightPercent}%`);
    const shortcuts = shortcutLabels(this.#deps.document.defaultView?.navigator.platform ?? "");
    BUTTONS.forEach(([command, label, glyph]) => {
      const shortcut = command === "split" ? "" : ` (${shortcuts[command]})`;
      actions.append(this.#button(command, label, glyph, `${label}${shortcut}`));
    });
    return actions;
  }
  #button(command, label, glyph, tooltip) {
    const button = this.#element("button", `vivarcdi-peek-${command}`);
    button.title = tooltip;
    button.setAttribute("aria-label", label);
    button.textContent = glyph;
    button.addEventListener("click", () => this.#deps.onCommand(command));
    return button;
  }
  #createWebview(url) {
    const webview = this.#element("webview", "vivarcdi-peek-page");
    if (this.#deps.partition !== null) {
      webview.setAttribute("partition", this.#deps.partition);
    }
    webview.addEventListener("loadcommit", (event) => this.#onLoadCommit(event));
    webview.addEventListener("newwindow", (event) => {
      event.preventDefault();
      webview.src = event.targetUrl;
    });
    webview.addEventListener(
      "consolemessage",
      (event) => this.#deps.onConsoleMessage(event.message)
    );
    webview.src = url;
    return webview;
  }
  #onLoadCommit(event) {
    if (!event.isTopLevel) {
      return;
    }
    this.#url = event.url;
    try {
      this.#webview.executeScript({ code: this.#deps.scripts.installKeys(this.#deps.token) });
    } catch {
      return;
    }
  }
  #element(tagName, className) {
    const element = this.#deps.document.createElement(tagName);
    element.className = className;
    return element;
  }
}
export {
  ACTIONS_CLASS,
  BACKDROP_CLASS,
  PANEL_CLASS,
  PeekPanel
};
