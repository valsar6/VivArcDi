const PANEL_ATTRIBUTE = "data-vivarcdi-connect-panel";
const CODE_ATTRIBUTE = "data-vivarcdi-connect-code";
const PRIMARY_ATTRIBUTE = "data-vivarcdi-connect-primary";
const HEADER_ATTRIBUTE = "data-vivarcdi-connect-header";
const HELP_ATTRIBUTE = "data-vivarcdi-connect-help";
const CHAR_ATTRIBUTE = "data-vivarcdi-connect-char";
const DASH_ATTRIBUTE = "data-vivarcdi-connect-dash";
const STATUS_ATTRIBUTE = "data-vivarcdi-connect-status";
const ACTIONS_ATTRIBUTE = "data-vivarcdi-connect-actions";
const TITLE = "Connect GitHub";
const HELP = "Paste this code on GitHub to connect your live folders.";
const WAITING = "Waiting for GitHub\u2026";
const COPY_LABEL = "Copy code and open GitHub";
const CANCEL_LABEL = "Cancel";
const RETRY_LABEL = "Try again";
const COPIED_MESSAGE = "Code copied, paste it on GitHub";
const CANCELLED_MESSAGE = "GitHub connection cancelled";
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
   * in boxes, one per character, under a `Connect GitHub` header, `Copy code and open GitHub`, and `Cancel`. It says `Waiting for GitHub…`
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
    const header = this.#header();
    switch (state.step) {
      case "asking":
        return [header, this.#text("Asking GitHub for a code\u2026"), this.#actions([this.#button(CANCEL_LABEL, () => this.#cancel())])];
      case "code":
        return [header, this.#help(), this.#code(state.userCode), this.#status(WAITING), this.#actions([this.#button(COPY_LABEL, () => this.#copyAndOpen(state), true), this.#button(CANCEL_LABEL, () => this.#cancel())])];
      case "connected":
        return [header, this.#text(state.login === "" ? "Connected" : `Connected as ${state.login}`)];
      case "failed":
        return [header, this.#text(state.message), this.#actions([this.#button(RETRY_LABEL, () => this.#start(), true), this.#button(CANCEL_LABEL, () => this.#cancel())])];
    }
  }
  #copyAndOpen({ userCode, verificationUri }) {
    const open = () => this.#deps.openPage(verificationUri);
    this.#deps.copier.write(userCode).then(() => {
      this.#deps.notify(COPIED_MESSAGE, "ok");
      open();
    }, open);
  }
  #cancel() {
    this.close();
    this.#deps.notify(CANCELLED_MESSAGE, "neutral");
  }
  #header() {
    const header = this.#text(TITLE);
    header.setAttribute(HEADER_ATTRIBUTE, "");
    return header;
  }
  #help() {
    const help = this.#text(HELP);
    help.setAttribute(HELP_ATTRIBUTE, "");
    return help;
  }
  #status(text) {
    const status = this.#text(text);
    status.setAttribute(STATUS_ATTRIBUTE, "");
    return status;
  }
  #actions(buttons) {
    const actions = this.#deps.document.createElement("div");
    actions.setAttribute(ACTIONS_ATTRIBUTE, "");
    actions.append(...buttons);
    return actions;
  }
  #code(userCode) {
    const code = this.#deps.document.createElement("div");
    code.setAttribute(CODE_ATTRIBUTE, "");
    code.append(
      ...[...userCode].map((character) => {
        const box = this.#deps.document.createElement("span");
        box.setAttribute(character === "-" ? DASH_ATTRIBUTE : CHAR_ATTRIBUTE, "");
        box.textContent = character === "-" ? "" : character;
        return box;
      })
    );
    return code;
  }
  #text(text) {
    const element = this.#deps.document.createElement("div");
    element.textContent = text;
    return element;
  }
  #button(label, run, primary = false) {
    const button = this.#deps.document.createElement("button");
    button.setAttribute("type", "button");
    button.textContent = label;
    button.toggleAttribute(PRIMARY_ATTRIBUTE, primary);
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
      this.#cancel();
    }
  }
}
export {
  ACTIONS_ATTRIBUTE,
  CANCELLED_MESSAGE,
  CANCEL_LABEL,
  CHAR_ATTRIBUTE,
  CODE_ATTRIBUTE,
  COPIED_MESSAGE,
  COPY_LABEL,
  ConnectPanel,
  DASH_ATTRIBUTE,
  HEADER_ATTRIBUTE,
  HELP,
  HELP_ATTRIBUTE,
  PANEL_ATTRIBUTE,
  PRIMARY_ATTRIBUTE,
  RETRY_LABEL,
  STATUS_ATTRIBUTE,
  TITLE,
  WAITING
};
