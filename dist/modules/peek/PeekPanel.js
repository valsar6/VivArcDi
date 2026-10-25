const BACKDROP_CLASS = "vivarcdi-peek-backdrop";
const PANEL_CLASS = "vivarcdi-peek-panel";
const BUTTONS = [
  ["expand", "Open as tab", "\u2197"],
  ["split", "Show side by side", "\u25EB"],
  ["close", "Close", "\u2715"]
];
class PeekPanel {
  #deps;
  #backdrop;
  #panel;
  #webview;
  #url;
  /**
   * The Peek: a dimmed backdrop over the page area and a rounded panel above it
   * that shows the real page in its own webview, with Expand, Split and Close buttons.
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
    dependencies.container.append(this.#backdrop, this.#panel);
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
  }
  #createPanel() {
    const panel = this.#element("div", PANEL_CLASS);
    panel.style.setProperty("--vivarcdi-peek-width", `${this.#deps.size.widthPercent}%`);
    panel.style.setProperty("--vivarcdi-peek-height", `${this.#deps.size.heightPercent}%`);
    const toolbar = this.#element("div", "vivarcdi-peek-toolbar");
    BUTTONS.forEach(([command, label, glyph]) => toolbar.append(this.#button(command, label, glyph)));
    panel.append(toolbar, this.#webview);
    return panel;
  }
  #button(command, label, glyph) {
    const button = this.#element("button", `vivarcdi-peek-${command}`);
    button.title = label;
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
  BACKDROP_CLASS,
  PANEL_CLASS,
  PeekPanel
};
