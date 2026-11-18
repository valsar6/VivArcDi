import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { extname, join, relative, resolve } from 'node:path';
import { DEBUG_HOST } from './VivaldiProcess.js';

export interface BuildInfo {
  vivarcdiVersion: string;
  vivaldiVersion: string;
  payloadFingerprint: string;
}

const BUILD_FILE = '/build.json';
const NOT_FOUND = 404;
const OK = 200;
const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export class PayloadServer {
  #server: Server;
  #url: string;

  private constructor(server: Server, url: string) {
    this.#server = server;
    this.#url = url;
  }

  /**
   * Serves the built payload to the lab window, as the installer's copy next to window.html would.
   * Only 127.0.0.1 can reach it, and only files inside `dist/`.
   *
   * @param dist The `dist/` folder of the working tree.
   * @param build What the installer would write to `build.json`.
   * @returns The running server.
   */
  public static async start(dist: string, build: BuildInfo): Promise<PayloadServer> {
    const root = resolve(dist);
    const server = createServer((request, response) => void PayloadServer.#answer(root, build, request, response));
    await new Promise<void>((done) => server.listen(0, DEBUG_HOST, done));
    const { port } = server.address() as AddressInfo;
    return new PayloadServer(server, `http://${DEBUG_HOST}:${port}/`);
  }

  /**
   * @returns The base URL of the payload, ending with a slash.
   */
  public get url(): string {
    return this.#url;
  }

  /**
   * Stops serving.
   */
  public async close(): Promise<void> {
    await new Promise<void>((done) => this.#server.close(() => done()));
  }

  static async #answer(root: string, build: BuildInfo, request: IncomingMessage, response: ServerResponse): Promise<void> {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://payload').pathname);
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (pathname === BUILD_FILE) {
      response.writeHead(OK, { ...headers, 'Content-Type': CONTENT_TYPES['.json'] }).end(JSON.stringify(build));
      return;
    }
    const file = join(root, pathname);
    const offset = relative(root, file);
    const body = offset.startsWith('..') ? null : await readFile(file).catch(() => null);
    if (body === null) {
      response.writeHead(NOT_FOUND, headers).end();
      return;
    }
    const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream';
    response.writeHead(OK, { ...headers, 'Content-Type': type }).end(body);
  }
}
