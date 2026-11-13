import type { Logger } from '../../core/support/Logger.js';
import type { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import type { Poll } from './Poll.js';
import type { QuietMoment } from './QuietMoment.js';
import type { WorkspaceMenu } from './WorkspaceMenu.js';

export type MenuResult = 'done' | 'deferred' | 'failed';

export interface MenuParts {
  /** Vivaldi's workspace menu. */
  menu: Pick<WorkspaceMenu, 'open' | 'startCreate' | 'startRename' | 'writeName' | 'save' | 'close'>;
  /** Tells when the user is not typing. */
  quiet: Pick<QuietMoment, 'now'>;
  /** Vivaldi's workspaces, to see that a name is listed. */
  names: Pick<WorkspaceNames, 'refresh' | 'names'>;
  /** Waits for a name to be listed. */
  poll: Pick<Poll, 'until'>;
  /** Logger for the failed step. */
  logger: Logger;
}

export const LISTED_TIMEOUT_MS = 3000;

export abstract class MenuCommand {
  protected readonly parts: MenuParts;
  #busy = false;
  #failed = false;

  /**
   * Base of the commands that drive Vivaldi's workspace menu. They run one at a time, only at a
   * quiet moment, close the menu after each run and, after a failed step, do nothing more until
   * Vivaldi starts again.
   *
   * @param parts Everything the command collaborates with.
   */
  protected constructor(parts: MenuParts) {
    this.parts = parts;
  }

  protected async attempt(job: () => Promise<void>, what: string): Promise<MenuResult> {
    if (this.#failed) {
      return 'failed';
    }
    if (this.#busy || !this.parts.quiet.now) {
      return 'deferred';
    }
    this.#busy = true;
    try {
      await job();
      return 'done';
    } catch (error) {
      this.#failed = true;
      this.parts.logger.warn(`${what} through Vivaldi's workspace menu failed: it is not tried again until the next start`, error);
      return 'failed';
    } finally {
      this.parts.menu.close();
      this.#busy = false;
    }
  }

  protected async listed(name: string): Promise<void> {
    const { names, poll } = this.parts;
    const found = await poll.until(async () => {
      await names.refresh();
      return names.names.includes(name) ? true : null;
    }, LISTED_TIMEOUT_MS);
    if (found === null) {
      throw new Error(`Vivaldi did not list ${name}`);
    }
  }
}
