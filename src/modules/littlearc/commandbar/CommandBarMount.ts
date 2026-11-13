import type { Logger } from '../../../core/support/Logger.js';
import type { CommandBarController } from './CommandBarController.js';
import type { CommandBarView } from './CommandBarView.js';

export interface CommandBarMountOptions {
  host: () => HTMLElement | null;
  controller: Pick<CommandBarController, 'state' | 'onChange' | 'open' | 'dismiss'>;
  view: Pick<CommandBarView, 'mount' | 'render' | 'unmount'>;
  logger: Logger;
}

export class CommandBarMount {
  #options: CommandBarMountOptions;
  #unsubscribe: (() => void) | null = null;

  /**
   * Shows and hides the command bar: the shortcut opens it, and presses it again to close it. When the
   * bar cannot be put in the window the caller is told, so that it can open the blank window instead.
   *
   * @param options Where the bar goes, its controller and its view.
   */
  constructor(options: CommandBarMountOptions) {
    this.#options = options;
  }

  /**
   * Opens the bar, or closes it when it is open.
   *
   * @returns False when the bar cannot be mounted; nothing is left in the window then.
   */
  public toggle(): boolean {
    const { controller, view, host, logger } = this.#options;
    if (controller.state.open) {
      controller.dismiss();
      return true;
    }
    const parent = host();
    if (parent === null) {
      logger.warn('the window has no place for the command bar: opening the blank window');
      return false;
    }
    try {
      view.mount(parent);
    } catch (error) {
      view.unmount();
      logger.warn('the command bar could not be mounted: opening the blank window', error);
      return false;
    }
    this.#unsubscribe = controller.onChange((state) => (state.open ? view.render(state) : this.#close()));
    void controller.open();
    return true;
  }

  /**
   * Closes the bar and removes its elements and listeners.
   */
  public stop(): void {
    this.#options.controller.dismiss();
    this.#close();
  }

  #close(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#options.view.unmount();
  }
}
