import { ConnectFlow } from './ConnectFlow.js';
import { ConnectPanel } from './ConnectPanel.js';
import type { ConnectPanelDependencies } from './ConnectPanel.js';
import { GithubDeviceFlow } from './GithubDeviceFlow.js';
import type { DeviceFetch } from './GithubDeviceFlow.js';
import type { GithubConnection } from './GithubConnection.js';

export interface GithubConnectDependencies extends Pick<ConnectPanelDependencies, 'document' | 'parent' | 'copier' | 'openPage' | 'closeAfterMs' | 'notify'> {
  /** The client id of the VivArcDi OAuth App, or an empty text when this VivArcDi has none. */
  clientId: string;
  connection: Pick<GithubConnection, 'save'>;
  send: DeviceFetch;
}

export class GithubConnect {
  #configured: boolean;
  #panel: ConnectPanel;

  /**
   * What `Connect GitHub` does: it opens the panel that runs GitHub's device flow with the client
   * id of this VivArcDi. Without a client id nothing can be connected and the panel never opens.
   *
   * @param dependencies The client id, the connection that keeps the token and what the panel needs.
   */
  constructor({ clientId, connection, send, ...panel }: GithubConnectDependencies) {
    this.#configured = clientId !== '';
    this.#panel = new ConnectPanel({ ...panel, flow: new ConnectFlow({ flow: new GithubDeviceFlow({ clientId, send }), connection }) });
  }

  /**
   * @returns Whether this VivArcDi has a client id, so that GitHub can be connected.
   */
  public get configured(): boolean {
    return this.#configured;
  }

  /**
   * Opens the panel at a point and starts connecting, unless there is no client id.
   *
   * @param x Horizontal position in the window.
   * @param y Vertical position in the window.
   */
  public open(x: number, y: number): void {
    if (this.#configured) {
      this.#panel.open(x, y);
    }
  }

  /**
   * Closes the panel and cancels the connecting, if it is open.
   */
  public close(): void {
    this.#panel.close();
  }
}
