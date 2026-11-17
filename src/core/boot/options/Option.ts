export interface NumberRange {
  /** The smallest allowed value. */
  min: number;
  /** The largest allowed value. */
  max: number;
}

export interface TextRules {
  /** Whether a text with nothing but spaces is refused. */
  nonEmpty?: boolean;
}

export type TextMap = Readonly<Record<string, string>>;

/**
 * One option of a module: its default and which values it accepts. A required option has no
 * default.
 */
export abstract class Option<T> {
  readonly #fallback: T | undefined;

  protected constructor(fallback: T | undefined) {
    this.#fallback = fallback;
  }

  /**
   * @param fallback The default.
   * @returns An option that accepts `true` and `false`.
   */
  public static boolean(fallback: boolean): Option<boolean> {
    return new BooleanOption(fallback);
  }

  /**
   * @param fallback The default.
   * @param range The smallest and largest allowed values, both included.
   * @returns An option that accepts finite numbers within the range.
   */
  public static number(fallback: number, range: NumberRange): Option<number> {
    return new NumberOption(fallback, range);
  }

  /**
   * @param fallback The default.
   * @param rules Whether an empty text is refused.
   * @returns An option that accepts texts, trimmed.
   */
  public static text(fallback: string, rules: TextRules = {}): Option<string> {
    return new TextOption(fallback, rules);
  }

  /**
   * @param rules Whether an empty text is refused.
   * @returns An option with no default: the module stays off without it.
   */
  public static requiredText(rules: TextRules = {}): Option<string> {
    return new TextOption(undefined, rules);
  }

  /**
   * @param fallback The default, one of the choices.
   * @param choices The accepted values.
   * @returns An option that accepts one of the choices.
   */
  public static choice<C extends string>(fallback: C, choices: readonly C[]): Option<C> {
    return new ChoiceOption(fallback, choices);
  }

  /**
   * @param fallback The default.
   * @returns An option that accepts an object whose values are all texts.
   */
  public static textMap(fallback: TextMap = {}): Option<TextMap> {
    return new TextMapOption(fallback);
  }

  /**
   * @returns Whether the option has no default.
   */
  public get required(): boolean {
    return this.#fallback === undefined;
  }

  /**
   * @returns The default, or undefined for a required option.
   */
  public get fallback(): T | undefined {
    return this.#fallback;
  }

  /**
   * @param value A value from `config.json`.
   * @returns The value to use, or undefined when the option does not accept it.
   */
  public abstract read(value: unknown): T | undefined;

  /**
   * @returns What the option accepts, for a warning, e.g. `a number from 40 to 100`.
   */
  public abstract describe(): string;
}

class BooleanOption extends Option<boolean> {
  constructor(fallback: boolean) {
    super(fallback);
  }

  public read(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  public describe(): string {
    return 'true or false';
  }
}

class NumberOption extends Option<number> {
  readonly #range: NumberRange;

  constructor(fallback: number, range: NumberRange) {
    super(fallback);
    this.#range = range;
  }

  public read(value: unknown): number | undefined {
    const { min, max } = this.#range;
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
  }

  public describe(): string {
    return `a number from ${this.#range.min} to ${this.#range.max}`;
  }
}

class TextOption extends Option<string> {
  readonly #nonEmpty: boolean;

  constructor(fallback: string | undefined, { nonEmpty = false }: TextRules) {
    super(fallback);
    this.#nonEmpty = nonEmpty;
  }

  public read(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const text = value.trim();
    return this.#nonEmpty && text === '' ? undefined : text;
  }

  public describe(): string {
    return this.#nonEmpty ? 'a text that is not empty' : 'a text';
  }
}

class ChoiceOption<C extends string> extends Option<C> {
  readonly #choices: readonly C[];

  constructor(fallback: C, choices: readonly C[]) {
    super(fallback);
    this.#choices = choices;
  }

  public read(value: unknown): C | undefined {
    return this.#choices.find((choice) => choice === value);
  }

  public describe(): string {
    return `one of ${this.#choices.join(', ')}`;
  }
}

class TextMapOption extends Option<TextMap> {
  constructor(fallback: TextMap) {
    super(fallback);
  }

  public read(value: unknown): TextMap | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }
    const entries = Object.entries(value);
    return entries.every((entry): entry is [string, string] => typeof entry[1] === 'string') ? Object.freeze(Object.fromEntries(entries)) : undefined;
  }

  public describe(): string {
    return 'an object whose values are texts';
  }
}
