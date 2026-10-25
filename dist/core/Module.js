class Module {
  /**
   * Unique id used in `config.json` to enable and configure the module.
   * Every subclass must override it.
   */
  static id = "";
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
