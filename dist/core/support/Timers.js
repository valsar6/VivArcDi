const systemTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
export {
  systemTimers
};
