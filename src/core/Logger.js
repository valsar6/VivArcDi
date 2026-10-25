export class Logger {
  #prefix;
  #sink;

  /**
   * Creates a logger that prefixes every message with a tag.
   *
   * @param {string} [prefix='VivArcDi'] Tag shown in front of each message.
   * @param {Pick<Console, 'info' | 'warn' | 'error'>} [sink=console] Output target.
   */
  constructor(prefix = 'VivArcDi', sink = console) {
    this.#prefix = prefix;
    this.#sink = sink;
  }

  /**
   * Returns a logger whose tag is this logger's tag followed by a name.
   *
   * @param {string} name Name of the component that will log.
   * @returns {Logger} A logger tagged `prefix:name`.
   */
  child(name) {
    return new Logger(`${this.#prefix}:${name}`, this.#sink);
  }

  /**
   * @param {...unknown} message Values to log.
   */
  info(...message) {
    this.#sink.info(this.#tag, ...message);
  }

  /**
   * @param {...unknown} message Values to log.
   */
  warn(...message) {
    this.#sink.warn(this.#tag, ...message);
  }

  /**
   * @param {...unknown} message Values to log.
   */
  error(...message) {
    this.#sink.error(this.#tag, ...message);
  }

  get #tag() {
    return `[${this.#prefix}]`;
  }
}
