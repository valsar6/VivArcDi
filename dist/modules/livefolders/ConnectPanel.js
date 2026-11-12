const PANEL_ATTRIBUTE = "data-vivarcdi-connect-panel";
const CODE_ATTRIBUTE = "data-vivarcdi-connect-code";
const COPY_LABEL = "Copy code and open GitHub";
const CANCEL_LABEL = "Cancel";
const RETRY_LABEL = "Try again";
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class ConnectPanel {
  #deps;
  #timers;
  #element = null;
  #closing = null;
  #onKey = (event) => this.#key(event);
  /**
   * The small panel below a live folder where the user connects GitHub: the code GitHub returned
   * in large letters, `Copy code and open GitHub`, and `Cancel`. It says `Waiting for GitHub…`
   * while the user authorizes, `Connected as <login>` for a moment when GitHub returned a token,
   * and why it failed with `Try again` when the code expired or access was denied. It closes on
   * Cancel and on Escape, which cancels the flow, but not on a click elsewhere, because the user
   * has to go to GitHub's tab and come back.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#timers = dependencies.timers ?? defaultTimers;
  }
  /**
   * Opens the panel at a point, closing the one that is open, and starts connecting.
   *
   * @param x Horizontal position in the window.
   * @param y Vertical position in the window.
   */
  open(x, y) {
    this.close();
    const element = this.#deps.document.createElement("div");
    element.setAttribute(PANEL_ATTRIBUTE, "");
    element.setAttribute("role", "dialog");
    element.style.setProperty("left", `${x}px`);
    element.style.setProperty("top", `${y}px`);
    element.addEventListener("keydown", this.#onKey);
    this.#deps.parent().append(element);
    this.#element = element;
    this.#start();
  }
  /**
   * Closes the panel and cancels what it was waiting for, if it is open.
   */
  close() {
    this.#cancelClosing();
    if (this.#element !== null) {
      this.#deps.flow.cancel();
    }
    this.#element?.remove();
    this.#element = null;
  }
  #start() {
    void this.#deps.flow.run((state) => this.#show(state));
  }
  #show(state) {
    const element = this.#element;
    if (element === null) {
      return;
    }
    element.replaceChildren(...this.#content(state));
    element.querySelector("button")?.focus();
    if (state.step === "connected") {
      this.#closing = this.#timers.set(() => this.close(), this.#deps.closeAfterMs);
    }
  }
  #content(state) {
    switch (state.step) {
      case "asking":
        return [this.#text("Asking GitHub for a code\u2026"), this.#button(CANCEL_LABEL, () => this.close())];
      case "code":
        return [this.#code(state.userCode), this.#text("Waiting for GitHub\u2026"), this.#button(COPY_LABEL, () => this.#copyAndOpen(state)), this.#button(CANCEL_LABEL, () => this.close())];
      case "connected":
        return [this.#text(state.login === "" ? "Connected" : `Connected as ${state.login}`)];
      case "failed":
        return [this.#text(state.message), this.#button(RETRY_LABEL, () => this.#start()), this.#button(CANCEL_LABEL, () => this.close())];
    }
  }
  #copyAndOpen({ userCode, verificationUri }) {
    const open = () => this.#deps.openPage(verificationUri);
    this.#deps.copier.write(userCode).then(open, open);
  }
  #code(userCode) {
    const code = this.#text(userCode);
    code.setAttribute(CODE_ATTRIBUTE, "");
    return code;
  }
  #text(text) {
    const element = this.#deps.document.createElement("div");
    element.textContent = text;
    return element;
  }
  #button(label, run) {
    const button = this.#deps.document.createElement("button");
    button.setAttribute("type", "button");
    button.textContent = label;
    button.addEventListener("click", run);
    return button;
  }
  #cancelClosing() {
    if (this.#closing !== null) {
      this.#timers.clear(this.#closing);
      this.#closing = null;
    }
  }
  #key(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
}
export {
  CANCEL_LABEL,
  CODE_ATTRIBUTE,
  COPY_LABEL,
  ConnectPanel,
  PANEL_ATTRIBUTE,
  RETRY_LABEL
};
