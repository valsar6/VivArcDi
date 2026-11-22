const DIALOG_ATTRIBUTE = "data-vivarcdi-dialog";
const INVALID_ATTRIBUTE = "data-vivarcdi-invalid";
const PART = "data-vivarcdi-dialog-";
class PromptDialog {
  #deps;
  #cancelOpen = null;
  /**
   * A small modal with one text field, drawn over the window. It closes on Escape, Cancel and a
   * click on the backdrop; only one is open at a time.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Asks for one line of text. The field is focused with its text selected.
   *
   * @param options The texts and the check of the value.
   * @returns The trimmed value on Enter or the confirm button, `null` when cancelled. A second call cancels the first.
   */
  ask(options) {
    this.#cancelOpen?.();
    return new Promise((resolve) => this.#build(options, resolve));
  }
  #build(options, resolve) {
    const { document } = this.#deps;
    const parts = this.#parts();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(null);
      }
    };
    const finish = (value) => {
      document.removeEventListener("keydown", onKey, true);
      parts.backdrop.remove();
      this.#cancelOpen = null;
      resolve(value);
    };
    this.#cancelOpen = () => finish(null);
    this.#fill(parts, options, finish);
    parts.backdrop.addEventListener("click", (event) => {
      if (event.target === parts.backdrop) {
        finish(null);
      }
    });
    this.#deps.parent().append(parts.backdrop);
    document.addEventListener("keydown", onKey, true);
    parts.field.focus();
    parts.field.select();
  }
  #make(part, tag = "div", content = "") {
    const element = this.#deps.document.createElement(tag);
    element.setAttribute(`${PART}${part}`, "");
    element.textContent = content;
    return element;
  }
  #parts() {
    const backdrop = this.#make("backdrop");
    backdrop.setAttribute(DIALOG_ATTRIBUTE, "");
    const box = this.#make("box");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    const alert = this.#make("alert");
    alert.setAttribute("role", "alert");
    backdrop.append(box);
    return { backdrop, box, field: this.#make("field", "input"), alert };
  }
  #fill(parts, options, finish) {
    const { box, field, alert } = parts;
    const submit = () => {
      const value = field.value.trim();
      const reason = options.validate?.(value) ?? null;
      this.#mark(field, alert, reason);
      if (reason === null) {
        finish(value);
      }
    };
    const confirm = this.#make("confirm", "button", options.confirm);
    const cancel = this.#make("cancel", "button", "Cancel");
    confirm.addEventListener("click", submit);
    cancel.addEventListener("click", () => finish(null));
    field.value = options.value;
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    field.addEventListener("input", () => this.#mark(field, alert, null));
    const actions = this.#make("actions");
    actions.append(cancel, confirm);
    box.append(this.#make("title", "h2", options.title));
    if (options.text !== void 0) {
      box.append(this.#make("text", "p", options.text));
    }
    box.append(this.#make("label", "label", options.label), field, alert, actions);
  }
  #mark(field, alert, reason) {
    if (reason === null) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute(INVALID_ATTRIBUTE);
    } else {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute(INVALID_ATTRIBUTE, "");
    }
    alert.textContent = reason ?? "";
  }
}
export {
  DIALOG_ATTRIBUTE,
  INVALID_ATTRIBUTE,
  PromptDialog
};
