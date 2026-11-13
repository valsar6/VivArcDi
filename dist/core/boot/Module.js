class Module {
  /**
   * Unique id used in `config.json` to enable and configure the module.
   * Every subclass must override it.
   */
  static id = "";
  /**
   * Whether the module may start in a private window: `never` (the default, for modules that store
   * anything or draw the normal tab bar), `allowed` (acts the same in both kinds of window) or
   * `only` (private windows alone). A module that stores data must keep `never`.
   */
  static privateWindows = "never";
  /**
   * Starts the module. Called once, after Vivaldi's interface is ready.
   *
   * @param _context What the module may use.
   */
  start(_context) {
    throw new Error(`${this.constructor.name} must implement start()`);
  }
  /**
   * Undoes everything `start` did. Called when VivArcDi shuts down.
   */
  stop() {
  }
}
export {
  Module
};
