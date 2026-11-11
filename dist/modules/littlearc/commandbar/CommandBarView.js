import { LinkIcon } from "../../folders/LinkIcon.js";
import { ClickCatcher } from "./ClickCatcher.js";
import { CommandBarFactory } from "./CommandBarElements.js";
import { keyCommand } from "./CommandBarKeys.js";
import { CommandRowView, LETTER_CLASS, ROW_ATTRIBUTE } from "./CommandRowView.js";
const SELECTED = "aria-selected";
const EMPTY = "data-empty";
class CommandBarView {
  #options;
  #elements = null;
  #catcher = null;
  #shown = null;
  #cleanups = [];
  /**
   * The DOM of the command bar. `mount` puts it over the window and starts listening; `unmount`
   * removes the elements and every listener. It holds no state of its own: it draws what the controller
   * reports and tells the controller what the user does.
   *
   * @param options The document, the controller and the keeper of the keyboard focus.
   */
  constructor(options) {
    this.#options = options;
  }
  /**
   * @returns Whether the elements are in the window.
   */
  get mounted() {
    return this.#elements !== null;
  }
  /**
   * Adds the bar to a window and focuses its field.
   *
   * @param host The element that holds the window's interface (`#browser`).
   */
  mount(host) {
    const elements = CommandBarFactory.create(this.#options.document);
    this.#elements = elements;
    this.#options.focus.remember();
    this.#listen(elements);
    host.append(elements.catcher);
    elements.input.focus();
  }
  /**
   * Draws the rows and the selection of a state.
   *
   * @param state What the controller reports.
   */
  render(state) {
    const elements = this.#elements;
    if (elements === null) {
      return;
    }
    if (state.rows !== this.#shown) {
      this.#shown = state.rows;
      elements.list.replaceChildren(...state.rows.map((row, index) => CommandRowView.create(this.#options.document, row, index)));
      elements.card.toggleAttribute(EMPTY, state.rows.length === 0);
    }
    [...elements.list.children].forEach((row, index) => row.setAttribute(SELECTED, String(index === state.selected)));
  }
  /**
   * Removes the elements and the listeners and gives the focus back.
   */
  unmount() {
    const elements = this.#elements;
    if (elements === null) {
      return;
    }
    this.#cleanups.forEach((cleanup) => cleanup());
    this.#cleanups = [];
    this.#catcher?.detach();
    this.#catcher = null;
    elements.catcher.remove();
    this.#elements = null;
    this.#shown = null;
    this.#options.focus.restore();
  }
  #listen(elements) {
    const { controller } = this.#options;
    const { catcher, card, input, close, list } = elements;
    this.#on(input, "input", () => void controller.type(input.value));
    this.#on(card, "keydown", (event) => this.#press(event));
    this.#on(close, "click", () => controller.dismiss());
    this.#on(list, "mousemove", (event) => this.#rowOf(event, (index) => controller.select(index)));
    this.#on(list, "mousedown", (event) => event.preventDefault());
    this.#on(list, "click", (event) => this.#rowOf(event, (index) => void controller.activate(index)));
    this.#on(list, "error", (event) => LinkIcon.fallback(event, LETTER_CLASS), true);
    this.#catcher = new ClickCatcher(catcher, card, () => controller.dismiss());
    this.#catcher.attach();
  }
  #on(target, type, listener, capture = false) {
    target.addEventListener(type, listener, capture);
    this.#cleanups.push(() => target.removeEventListener(type, listener, capture));
  }
  #press(event) {
    const command = keyCommand(event);
    if (command === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { controller } = this.#options;
    const actions = {
      up: () => controller.up(),
      down: () => controller.down(),
      submit: () => void controller.submit(),
      dismiss: () => controller.dismiss()
    };
    actions[command]();
  }
  #rowOf(event, act) {
    const row = event.target?.closest(`[${ROW_ATTRIBUTE}]`);
    const index = Number(row?.getAttribute(ROW_ATTRIBUTE) ?? Number.NaN);
    if (Number.isInteger(index)) {
      act(index);
    }
  }
}
export {
  CommandBarView
};
