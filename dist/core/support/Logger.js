class Logger {
  #prefix;
  #sink;
  /**
   * Creates a logger that prefixes every message with a tag.
   *
   * @param prefix Tag shown in front of each message.
   * @param sink Output target.
   */
  constructor(prefix = "VivArcDi", sink = console) {
    this.#prefix = prefix;
    this.#sink = sink;
  }
  /**
   * Returns a logger whose tag is this logger's tag followed by a name.
   *
   * @param name Name of the component that will log.
   * @returns A logger tagged `prefix:name`.
   */
  child(name) {
    return new Logger(`${this.#prefix}:${name}`, this.#sink);
  }
  /**
   * @param message Values to log.
   */
  info(...message) {
    this.#sink.info(this.#tag, ...message);
  }
  /**
   * @param message Values to log.
   */
  warn(...message) {
    this.#sink.warn(this.#tag, ...message);
  }
  /**
   * @param message Values to log.
   */
  error(...message) {
    this.#sink.error(this.#tag, ...message);
  }
  get #tag() {
    return `[${this.#prefix}]`;
  }
}
export {
  Logger
};
