export type CdpParams = Record<string, unknown>;
export type CdpListener = (params: CdpParams) => void;

export interface CdpSocket {
  send(text: string): void;
  close(): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

export type SocketOpener = (url: string) => Promise<CdpSocket>;

interface Pending {
  resolve(result: CdpParams): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

interface Incoming {
  id?: number;
  method?: string;
  params?: CdpParams;
  result?: CdpParams;
  error?: { message: string };
}

const COMMAND_TIMEOUT_MS = 30_000;

/**
 * Opens a WebSocket with the WebSocket built into Node.
 *
 * @param url The `webSocketDebuggerUrl` of a target.
 * @returns The open socket.
 */
export const openWebSocket: SocketOpener = (url) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => resolve(socket));
    socket.addEventListener('error', () => reject(new Error(`Cannot open ${url}`)));
  });

export class CdpConnection {
  #socket: CdpSocket;
  #nextId = 1;
  #pending = new Map<number, Pending>();
  #listeners = new Map<string, CdpListener[]>();

  /**
   * Speaks the Chrome DevTools Protocol over one socket: numbered commands and their replies,
   * and events by method name.
   *
   * @param socket An open socket to one target.
   */
  constructor(socket: CdpSocket) {
    this.#socket = socket;
    socket.addEventListener('message', ({ data }) => this.#receive(String(data)));
  }

  /**
   * @param url The `webSocketDebuggerUrl` of a target.
   * @param open Opens the socket; a fake in tests.
   * @returns A connection to that target.
   */
  public static async connect(url: string, open: SocketOpener = openWebSocket): Promise<CdpConnection> {
    return new CdpConnection(await open(url));
  }

  /**
   * @param method CDP method, e.g. `Runtime.evaluate`.
   * @param params Its parameters.
   * @returns The result of the command.
   * @throws {Error} When the target answers with an error or does not answer within 30 seconds.
   */
  public send(method: string, params: CdpParams = {}): Promise<CdpParams> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.#fail(id, new Error(`${method} got no answer`)), COMMAND_TIMEOUT_MS);
      this.#pending.set(id, { resolve, reject, timer });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * @param method CDP event, e.g. `Runtime.consoleAPICalled`.
   * @param listener Called with the event parameters.
   */
  public on(method: string, listener: CdpListener): void {
    this.#listeners.set(method, [...(this.#listeners.get(method) ?? []), listener]);
  }

  /**
   * Closes the socket and fails the commands still waiting.
   */
  public close(): void {
    [...this.#pending.keys()].forEach((id) => this.#fail(id, new Error('The connection was closed')));
    this.#socket.close();
  }

  #receive(text: string): void {
    const message = JSON.parse(text) as Incoming;
    if (message.id !== undefined) {
      this.#settle(message.id, message);
    } else if (message.method !== undefined) {
      this.#listeners.get(message.method)?.forEach((listener) => listener(message.params ?? {}));
    }
  }

  #settle(id: number, message: Incoming): void {
    const pending = this.#pending.get(id);
    if (pending === undefined) {
      return;
    }
    this.#pending.delete(id);
    clearTimeout(pending.timer);
    if (message.error !== undefined) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result ?? {});
    }
  }

  #fail(id: number, error: Error): void {
    const pending = this.#pending.get(id);
    this.#pending.delete(id);
    if (pending !== undefined) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }
}
