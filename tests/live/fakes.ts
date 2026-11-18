import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CdpConnection } from '../../scripts/live/cdp/CdpConnection.js';
import type { CdpParams, CdpSocket } from '../../scripts/live/cdp/CdpConnection.js';
import type { ChildHandle } from '../../scripts/live/VivaldiProcess.js';

export type Responder = (method: string, params: CdpParams) => CdpParams | { error: string };

export class FakeSocket implements CdpSocket {
  sent: Array<{ id: number; method: string; params: CdpParams }> = [];
  closed = false;
  #listener: (event: { data: unknown }) => void = () => {};
  #responder: Responder;

  constructor(responder: Responder = () => ({})) {
    this.#responder = responder;
  }

  send(text: string): void {
    const message = JSON.parse(text) as { id: number; method: string; params: CdpParams };
    this.sent.push(message);
    const reply = this.#responder(message.method, message.params);
    const body = 'error' in reply ? { id: message.id, error: { message: reply.error } } : { id: message.id, result: reply };
    queueMicrotask(() => this.#listener({ data: JSON.stringify(body) }));
  }

  close(): void {
    this.closed = true;
  }

  addEventListener(_type: 'message', listener: (event: { data: unknown }) => void): void {
    this.#listener = listener;
  }

  emit(method: string, params: CdpParams): void {
    this.#listener({ data: JSON.stringify({ method, params }) });
  }

  methods(): string[] {
    return this.sent.map((message) => message.method);
  }
}

export function fakeCdp(responder?: Responder): { cdp: CdpConnection; socket: FakeSocket } {
  const socket = new FakeSocket(responder);
  return { cdp: new CdpConnection(socket), socket };
}

export function consoleEvent(type: string, ...words: string[]): CdpParams {
  return { type, args: words.map((value) => ({ type: 'string', value })) };
}

export class FakeChild implements ChildHandle {
  exitCode: number | null = null;
  signals: NodeJS.Signals[] = [];
  #exit: Array<() => void> = [];

  kill(signal: NodeJS.Signals): boolean {
    this.signals.push(signal);
    this.exitCode = 0;
    this.#exit.forEach((listener) => listener());
    return true;
  }

  once(_event: 'exit', listener: () => void): unknown {
    this.#exit.push(listener);
    return this;
  }
}

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'vivarcdi-live-test-'));
}

export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value));
}
