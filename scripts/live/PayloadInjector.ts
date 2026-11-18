import type { CdpConnection } from './cdp/CdpConnection.js';

const LOADER = 'loader.js';

export class PayloadInjector {
  #cdp: CdpConnection;

  /**
   * Loads the served payload into the lab window instead of patching window.html.
   *
   * @param cdp Connection to window.html.
   */
  constructor(cdp: CdpConnection) {
    this.#cdp = cdp;
  }

  /**
   * @param base Base URL of the served payload, ending with a slash.
   * @returns The script that window.html runs before its own scripts on every load.
   */
  public static bootstrap(base: string): string {
    const loader = JSON.stringify(new URL(LOADER, base).href);
    return `import(${loader}).catch((error) => console.error('[VivArcDi] The served payload did not load', String(error)));`;
  }

  /**
   * Lets the lab window load scripts from 127.0.0.1, registers the payload before the page scripts and
   * reloads window.html so it boots as early as an installed payload.
   *
   * @param base Base URL of the served payload, ending with a slash.
   */
  public async inject(base: string): Promise<void> {
    await this.#cdp.send('Page.enable');
    await this.#cdp.send('Page.setBypassCSP', { enabled: true });
    await this.#cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PayloadInjector.bootstrap(base) });
    await this.#cdp.send('Page.reload');
  }
}
