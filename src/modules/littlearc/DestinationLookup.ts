import type { BrowserRuntime } from '../../core/BrowserRuntime.js';
import type { Logger } from '../../core/Logger.js';
import { destinationQuestion, parseDestinationAnswer } from './LittleArcMessage.js';
import type { DestinationAnswer } from './LittleArcMessage.js';

export type LookupRuntime = Pick<BrowserRuntime, 'messagesAvailable' | 'onMessage' | 'sendMessage'>;

export const DESTINATION_ANSWER_MS = 1000;

export class DestinationLookup {
  #runtime: LookupRuntime;
  #logger: Logger;
  #timeoutMs: number;

  /**
   * Asks the main window which workspace would receive the page and which colors it has.
   *
   * @param runtime The messages API.
   * @param logger Logger for failures.
   * @param timeoutMs How long to wait for the answer.
   */
  constructor(runtime: LookupRuntime, logger: Logger, timeoutMs = DESTINATION_ANSWER_MS) {
    this.#runtime = runtime;
    this.#logger = logger;
    this.#timeoutMs = timeoutMs;
  }

  /**
   * @returns The answer of the main window, or null when nobody answers in time or messages are missing.
   */
  public ask(): Promise<DestinationAnswer | null> {
    if (!this.#runtime.messagesAvailable) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let stop = (): void => undefined;
      const finish = (answer: DestinationAnswer | null): void => {
        clearTimeout(timer);
        stop();
        resolve(answer);
      };
      const timer = setTimeout(() => finish(null), this.#timeoutMs);
      stop = this.#runtime.onMessage((message) => {
        const answer = parseDestinationAnswer(message);
        if (answer !== null) {
          finish(answer);
        }
      });
      this.#runtime.sendMessage(destinationQuestion()).catch((error: unknown) => {
        this.#logger.warn('could not ask for the destination workspace', error);
        finish(null);
      });
    });
  }
}
