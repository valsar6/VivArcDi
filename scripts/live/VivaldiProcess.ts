import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const DEBUG_HOST = '127.0.0.1';

const PORT_FILE = 'DevToolsActivePort';
const POLL_MS = 100;
const START_TIMEOUT_MS = 30_000;
const STOP_GRACE_MS = 5_000;

export interface ChildHandle {
  readonly exitCode: number | null;
  kill(signal: NodeJS.Signals): boolean;
  once(event: 'exit', listener: () => void): unknown;
}

export type Spawner = (command: string, args: string[]) => ChildHandle;

export const spawnVivaldi: Spawner = (command, args) => spawn(command, args, { stdio: 'ignore' });

export class VivaldiProcess {
  #child: ChildHandle;
  #endpoint: string;

  private constructor(child: ChildHandle, endpoint: string) {
    this.#child = child;
    this.#endpoint = endpoint;
  }

  /**
   * The command line flags of the lab Vivaldi: its own profile and a debugging port that Chromium
   * picks among the free ones of 127.0.0.1.
   *
   * @param profile The lab user data directory.
   * @param extra Additional flags, such as `--no-sandbox` on Debian.
   * @returns The flags.
   */
  public static flags(profile: string, extra: string[] = []): string[] {
    return [
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      `--remote-debugging-address=${DEBUG_HOST}`,
      `--remote-allow-origins=http://${DEBUG_HOST}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--password-store=basic',
      ...extra,
    ];
  }

  /**
   * Starts the lab Vivaldi and waits until its debugging port is known.
   *
   * @param executable The lab executable.
   * @param profile The lab user data directory.
   * @param spawner Starts the process; a fake in tests.
   * @param extra Additional flags, see {@link VivaldiProcess.flags}.
   * @returns The running process.
   * @throws {Error} When Vivaldi exits or does not open the port in time.
   */
  public static async start(
    executable: string,
    profile: string,
    spawner: Spawner,
    extra: string[] = [],
  ): Promise<VivaldiProcess> {
    const child = spawner(executable, VivaldiProcess.flags(profile, extra));
    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Vivaldi exited with code ${child.exitCode} before opening the debugging port`);
      }
      const port = await readPort(profile);
      if (port !== null) {
        return new VivaldiProcess(child, `http://${DEBUG_HOST}:${port}`);
      }
      await sleep(POLL_MS);
    }
    child.kill('SIGKILL');
    throw new Error('Vivaldi did not open the debugging port within 30 seconds');
  }

  /**
   * @returns The base URL of the debugging endpoint, e.g. `http://127.0.0.1:53211`.
   */
  public get endpoint(): string {
    return this.#endpoint;
  }

  /**
   * Stops the Vivaldi this harness started, and only that one: asks it to quit, then kills it.
   */
  public async stop(): Promise<void> {
    if (this.#child.exitCode !== null) {
      return;
    }
    const exited = new Promise<void>((resolve) => this.#child.once('exit', resolve));
    this.#child.kill('SIGTERM');
    const grace = new AbortController();
    const late = sleep(STOP_GRACE_MS, 'late', { signal: grace.signal }).catch(() => 'cancelled');
    const outcome = await Promise.race([exited.then(() => 'exited'), late]);
    grace.abort();
    if (outcome === 'late') {
      this.#child.kill('SIGKILL');
      await exited;
    }
  }
}

async function readPort(profile: string): Promise<number | null> {
  try {
    const [line] = (await readFile(join(profile, PORT_FILE), 'utf8')).split('\n');
    const port = Number(line);
    return Number.isInteger(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}
