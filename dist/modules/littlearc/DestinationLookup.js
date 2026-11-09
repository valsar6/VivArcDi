import { destinationQuestion, parseDestinationAnswer } from "./LittleArcMessage.js";
const DESTINATION_ANSWER_MS = 1e3;
class DestinationLookup {
  #runtime;
  #logger;
  #timeoutMs;
  /**
   * Asks the main window which workspace would receive the page and which colors it has.
   *
   * @param runtime The messages API.
   * @param logger Logger for failures.
   * @param timeoutMs How long to wait for the answer.
   */
  constructor(runtime, logger, timeoutMs = DESTINATION_ANSWER_MS) {
    this.#runtime = runtime;
    this.#logger = logger;
    this.#timeoutMs = timeoutMs;
  }
  /**
   * @returns The answer of the main window, or null when nobody answers in time or messages are missing.
   */
  ask() {
    if (!this.#runtime.messagesAvailable) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let stop = () => void 0;
      const finish = (answer) => {
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
      this.#runtime.sendMessage(destinationQuestion()).catch((error) => {
        this.#logger.warn("could not ask for the destination workspace", error);
        finish(null);
      });
    });
  }
}
export {
  DESTINATION_ANSWER_MS,
  DestinationLookup
};
