import { DeviceFlowFailure } from "./GithubDeviceFlow.js";
const FAILURES = {
  expired: "The code expired.",
  denied: "Access was denied on GitHub.",
  unreachable: "GitHub cannot be reached."
};
class ConnectFlow {
  #deps;
  #run = 0;
  /**
   * The steps of connecting GitHub, in the order the panel shows them: ask GitHub for a code, wait
   * until the user authorized it on GitHub, store the token. When the code expires, the user
   * denies access or GitHub cannot be reached, nothing is stored and the state says why, so that
   * the panel can offer to try again.
   *
   * @param dependencies The device flow and the connection that keeps the token.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Runs the steps once. A run that is cancelled reports nothing more.
   *
   * @param show Called with each state, in order.
   * @returns A promise settled when the run is over.
   */
  async run(show) {
    const { flow, connection } = this.#deps;
    this.#run += 1;
    const run = this.#run;
    try {
      show({ step: "asking" });
      const code = await flow.start();
      if (run !== this.#run) {
        return;
      }
      show({ step: "code", userCode: code.userCode, verificationUri: code.verificationUri });
      const token = await flow.wait(code);
      show({ step: "connected", login: await connection.save(token) });
    } catch (error) {
      const reason = error instanceof DeviceFlowFailure ? error.reason : "unreachable";
      if (reason !== "cancelled" && run === this.#run) {
        show({ step: "failed", message: FAILURES[reason] });
      }
    }
  }
  /**
   * Stops the run in progress, whichever step it is at.
   */
  cancel() {
    this.#run += 1;
    this.#deps.flow.cancel();
  }
}
export {
  ConnectFlow
};
