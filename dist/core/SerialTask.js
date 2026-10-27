class SerialTask {
  #run;
  #onError;
  #running = null;
  #again = false;
  /**
   * Runs an async job one at a time: a request made while it runs is merged into one more run
   * after it, so bursts of events cost at most two runs.
   *
   * @param run The job.
   * @param onError Called when a run fails.
   */
  constructor(run, onError) {
    this.#run = run;
    this.#onError = onError;
  }
  /**
   * Runs the job now, or once more after the current run.
   */
  request() {
    if (this.#running !== null) {
      this.#again = true;
      return;
    }
    this.#running = this.#run().catch(this.#onError).finally(() => {
      this.#running = null;
      if (this.#again) {
        this.#again = false;
        this.request();
      }
    });
  }
  /**
   * @returns A promise settled when the current run, and the one queued after it, are over.
   */
  async idle() {
    while (this.#running !== null) {
      await this.#running;
    }
  }
}
export {
  SerialTask
};
