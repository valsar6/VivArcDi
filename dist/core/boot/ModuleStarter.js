class ModuleStarter {
  #services;
  #logger;
  /**
   * Starts one module with a context built from the injected services.
   *
   * @param services The services every module receives.
   * @param logger Logger of the application; each module gets a child.
   */
  constructor(services, logger) {
    this.#services = services;
    this.#logger = logger;
  }
  /**
   * Starts a module. A failure is logged, never thrown.
   *
   * @param entry The module to start.
   * @param start The services of this window and the checked settings.
   * @returns How the module ended: started, failed, or off by invalid options.
   */
  async start(entry, start) {
    const { settings, selectors, build, storage, notices } = start;
    const options = settings.optionsOf(entry.id);
    const logger = this.#logger.child(entry.id);
    if (options === null) {
      logger.warn("stays off: invalid options");
      return "invalid-options";
    }
    try {
      await entry.module.start({
        ...this.#services,
        selectors,
        logger,
        options,
        build,
        modules: settings.all,
        storage,
        notices
      });
      return "started";
    } catch (error) {
      logger.error("Failed to start", error);
      return "failed";
    }
  }
}
export {
  ModuleStarter
};
