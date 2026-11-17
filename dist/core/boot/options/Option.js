class Option {
  #fallback;
  constructor(fallback) {
    this.#fallback = fallback;
  }
  /**
   * @param fallback The default.
   * @returns An option that accepts `true` and `false`.
   */
  static boolean(fallback) {
    return new BooleanOption(fallback);
  }
  /**
   * @param fallback The default.
   * @param range The smallest and largest allowed values, both included.
   * @returns An option that accepts finite numbers within the range.
   */
  static number(fallback, range) {
    return new NumberOption(fallback, range);
  }
  /**
   * @param fallback The default.
   * @param rules Whether an empty text is refused.
   * @returns An option that accepts texts, trimmed.
   */
  static text(fallback, rules = {}) {
    return new TextOption(fallback, rules);
  }
  /**
   * @param rules Whether an empty text is refused.
   * @returns An option with no default: the module stays off without it.
   */
  static requiredText(rules = {}) {
    return new TextOption(void 0, rules);
  }
  /**
   * @param fallback The default, one of the choices.
   * @param choices The accepted values.
   * @returns An option that accepts one of the choices.
   */
  static choice(fallback, choices) {
    return new ChoiceOption(fallback, choices);
  }
  /**
   * @param fallback The default.
   * @returns An option that accepts an object whose values are all texts.
   */
  static textMap(fallback = {}) {
    return new TextMapOption(fallback);
  }
  /**
   * @returns Whether the option has no default.
   */
  get required() {
    return this.#fallback === void 0;
  }
  /**
   * @returns The default, or undefined for a required option.
   */
  get fallback() {
    return this.#fallback;
  }
}
class BooleanOption extends Option {
  constructor(fallback) {
    super(fallback);
  }
  read(value) {
    return typeof value === "boolean" ? value : void 0;
  }
  describe() {
    return "true or false";
  }
}
class NumberOption extends Option {
  #range;
  constructor(fallback, range) {
    super(fallback);
    this.#range = range;
  }
  read(value) {
    const { min, max } = this.#range;
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : void 0;
  }
  describe() {
    return `a number from ${this.#range.min} to ${this.#range.max}`;
  }
}
class TextOption extends Option {
  #nonEmpty;
  constructor(fallback, { nonEmpty = false }) {
    super(fallback);
    this.#nonEmpty = nonEmpty;
  }
  read(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const text = value.trim();
    return this.#nonEmpty && text === "" ? void 0 : text;
  }
  describe() {
    return this.#nonEmpty ? "a text that is not empty" : "a text";
  }
}
class ChoiceOption extends Option {
  #choices;
  constructor(fallback, choices) {
    super(fallback);
    this.#choices = choices;
  }
  read(value) {
    return this.#choices.find((choice) => choice === value);
  }
  describe() {
    return `one of ${this.#choices.join(", ")}`;
  }
}
class TextMapOption extends Option {
  constructor(fallback) {
    super(fallback);
  }
  read(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return void 0;
    }
    const entries = Object.entries(value);
    return entries.every((entry) => typeof entry[1] === "string") ? Object.freeze(Object.fromEntries(entries)) : void 0;
  }
  describe() {
    return "an object whose values are texts";
  }
}
export {
  Option
};
