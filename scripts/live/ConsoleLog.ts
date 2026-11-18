import type { CdpConnection, CdpParams } from './cdp/CdpConnection.js';

export interface ConsoleLine {
  level: string;
  text: string;
}

interface RemoteValue {
  value?: unknown;
  description?: string;
}

const TAG_START = '[VivArcDi';

export class ConsoleLog {
  #lines: ConsoleLine[] = [];

  /**
   * Keeps the console lines of window.html that the payload's Logger wrote.
   *
   * @param cdp Connection to window.html with the Runtime domain enabled.
   */
  constructor(cdp: CdpConnection) {
    cdp.on('Runtime.consoleAPICalled', (params) => this.#record(params));
  }

  /**
   * @returns Every VivArcDi line so far, oldest first.
   */
  public get lines(): ConsoleLine[] {
    return [...this.#lines];
  }

  /**
   * @returns The VivArcDi lines logged as errors.
   */
  public get errors(): ConsoleLine[] {
    return this.#lines.filter((line) => line.level === 'error');
  }

  #record(params: CdpParams): void {
    const args = (params['args'] ?? []) as RemoteValue[];
    const words = args.map((arg) => (typeof arg.value === 'string' ? arg.value : (arg.description ?? JSON.stringify(arg.value))));
    if (words[0]?.startsWith(TAG_START)) {
      this.#lines.push({ level: String(params['type']), text: words.join(' ') });
    }
  }
}
