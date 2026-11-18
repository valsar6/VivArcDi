export type Disposer = () => Promise<void> | void;

export interface SignalSource {
  once(signal: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
  exit(code: number): never;
}

const INTERRUPTED_EXIT_CODE = 130;

export class Cleanup {
  #disposers: Disposer[] = [];
  #ran = false;

  /**
   * Remembers a step that undoes something the run did, such as stopping Vivaldi.
   *
   * @param disposer Undo step; runs before the steps added earlier.
   */
  public add(disposer: Disposer): void {
    this.#disposers.push(disposer);
  }

  /**
   * Runs every undo step once, the last added first. A failing step does not stop the others.
   *
   * @returns The errors of the steps that failed.
   */
  public async run(): Promise<unknown[]> {
    if (this.#ran) {
      return [];
    }
    this.#ran = true;
    const errors: unknown[] = [];
    for (const disposer of [...this.#disposers].reverse()) {
      try {
        await disposer();
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  /**
   * Runs the undo steps and exits when the process is interrupted.
   *
   * @param source The process, or a fake in tests.
   */
  public onSignals(source: SignalSource): void {
    const stop = (): void => {
      void this.run().finally(() => source.exit(INTERRUPTED_EXIT_CODE));
    };
    source.once('SIGINT', stop);
    source.once('SIGTERM', stop);
  }
}
