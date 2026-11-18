import { setTimeout as sleep } from 'node:timers/promises';

export interface TargetInfo {
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export type TargetLister = (endpoint: string) => Promise<TargetInfo[]>;

const WINDOW_SUFFIX = '/window.html';
const POLL_MS = 250;
const WAIT_MS = 30_000;

/**
 * Lists the debugging targets of a running Vivaldi.
 *
 * @param endpoint Base URL of the debugging endpoint.
 * @returns The targets from `/json/list`.
 */
export const listTargets: TargetLister = async (endpoint) =>
  (await (await fetch(`${endpoint}/json/list`)).json()) as TargetInfo[];

export class WindowTarget {
  /**
   * Waits until Vivaldi lists its browser window and returns the socket URL of `window.html`.
   *
   * @param endpoint Base URL of the debugging endpoint.
   * @param list Lists the targets; a fake in tests.
   * @param waitMs How long to wait for the window.
   * @returns The `webSocketDebuggerUrl` of `window.html`.
   * @throws {Error} When no `window.html` target appears in time.
   */
  public static async find(endpoint: string, list: TargetLister = listTargets, waitMs = WAIT_MS): Promise<string> {
    const deadline = Date.now() + waitMs;
    do {
      const url = WindowTarget.pick(await list(endpoint).catch(() => []));
      if (url !== null) {
        return url;
      }
      await sleep(POLL_MS);
    } while (Date.now() < deadline);
    throw new Error(`No window.html target at ${endpoint}`);
  }

  /**
   * @param targets The targets of a running Vivaldi.
   * @returns The socket URL of the first `window.html` target, or null.
   */
  public static pick(targets: TargetInfo[]): string | null {
    const target = targets.find((item) => new URL(item.url).pathname === WINDOW_SUFFIX && item.webSocketDebuggerUrl);
    return target?.webSocketDebuggerUrl ?? null;
  }
}
