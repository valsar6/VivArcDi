/** Timers an object receives so that tests can replace them. */
export interface Timers {
  set(run: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

/** The real timers, read from the global scope at each call. */
export const systemTimers: Timers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
