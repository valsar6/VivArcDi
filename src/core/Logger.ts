export type LogSink = Pick<Console, 'info' | 'warn' | 'error'>;

export class Logger {
  #prefix: string;
  #sink: LogSink;

  /**
   * Creates a logger that prefixes every message with a tag.
   *
   * @param prefix Tag shown in front of each message.
   * @param sink Output target.
   */
  constructor(prefix = 'VivArcDi', sink: LogSink = console) {
    this.#prefix = prefix;
    this.#sink = sink;
  }

  /**
   * Returns a logger whose tag is this logger's tag followed by a name.
   *
   * @param name Name of the component that will log.
   * @returns A logger tagged `prefix:name`.
   */
  public child(name: string): Logger {
    return new Logger(`${this.#prefix}:${name}`, this.#sink);
  }

  /**
   * @param message Values to log.
   */
  public info(...message: unknown[]): void {
    this.#sink.info(this.#tag, ...message);
  }

  /**
   * @param message Values to log.
   */
  public warn(...message: unknown[]): void {
    this.#sink.warn(this.#tag, ...message);
  }

  /**
   * @param message Values to log.
   */
  public error(...message: unknown[]): void {
    this.#sink.error(this.#tag, ...message);
  }

  get #tag(): string {
    return `[${this.#prefix}]`;
  }
}
