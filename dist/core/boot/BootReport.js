const BOOT_NOTICE_KEY = "boot-failed";
const MARKING_MODULE = "activation-marker";
const SEVERE_FAILURES = 2;
const UNKNOWN = "unknown";
const NONE = "none";
const MINOR_PARTS = 2;
function bootNoticeText(failed, tried) {
  return `VivArcDi could not start ${failed} of ${tried} features: details are in the console`;
}
class BootReport {
  #logger;
  #stage = "config";
  #build = null;
  #catalog = null;
  #skipped = { config: 0, window: 0 };
  #started = [];
  #failed = [];
  #invalid = [];
  /**
   * Collects what one start reached and reports it at the end. It holds no DOM, timer or storage.
   *
   * @param logger The logger of the report, tagged `VivArcDi:boot`.
   */
  constructor(logger) {
    this.#logger = logger;
  }
  /**
   * @param stage The step the start is entering.
   */
  enter(stage) {
    this.#stage = stage;
  }
  /**
   * @param build The versions read from `build.json`.
   */
  useBuild(build) {
    this.#build = build;
  }
  /**
   * Keeps the catalog and logs one `info` line when it stands in for a newer Vivaldi.
   *
   * @param catalog The selector catalog in use.
   */
  useCatalog(catalog) {
    this.#catalog = catalog;
    const vivaldi = this.#build?.vivaldiVersion;
    if (vivaldi !== void 0 && catalog.standsInFor(vivaldi)) {
      const shown = vivaldi.split(".").slice(0, MINOR_PARTS).join(".");
      this.#logger.info(`Vivaldi ${shown} has no selector catalog of its own: using ${catalog.version}`);
    }
  }
  /**
   * @param config How many modules `config.json` leaves off.
   * @param window How many modules do not fit this kind of window.
   */
  skip(config, window) {
    this.#skipped = { config, window };
  }
  /**
   * @param id The module id.
   * @param outcome What became of the module.
   */
  record(id, outcome) {
    const lists = {
      started: this.#started,
      failed: this.#failed,
      "invalid-options": this.#invalid
    };
    lists[outcome].push(id);
  }
  /**
   * Logs one warning per undefined selector, then the summary line. Call it once per start.
   *
   * @param outcome How the start ended.
   */
  summarize(outcome) {
    for (const name of this.#catalog?.undefinedNames ?? []) {
      this.#logger.warn(`selector "${name}" is not defined in catalog ${this.#catalog?.version}`);
    }
    this.#logger[this.#level(outcome)](this.#line(outcome));
  }
  /**
   * Shows the boot notice for a severe start whose activation mark is on.
   *
   * @param outcome How the start ended.
   * @param notices The window notices, or null when they do not exist yet.
   */
  notify(outcome, notices) {
    if (outcome !== "active" || !this.#severe || !this.#started.includes(MARKING_MODULE)) {
      return;
    }
    notices?.once(BOOT_NOTICE_KEY, bootNoticeText(this.#failed.length, this.#tried), "error");
  }
  get #severe() {
    return this.#failed.length >= SEVERE_FAILURES;
  }
  get #tried() {
    return this.#started.length + this.#failed.length;
  }
  get #undefinedCount() {
    return this.#catalog?.undefinedNames.length ?? 0;
  }
  #level(outcome) {
    if (outcome === "failed" || outcome === "active" && this.#severe) {
      return "error";
    }
    const problems = this.#failed.length + this.#invalid.length + this.#undefinedCount;
    return outcome === "inactive" || problems > 0 ? "warn" : "info";
  }
  #line(outcome) {
    const result = outcome === "failed" ? `failed at ${this.#stage}` : outcome;
    const ids = this.#failed.length > 0 ? `: ${this.#failed.join(", ")}` : "";
    const { config, window } = this.#skipped;
    return `self-check: ${result}, ${this.#started.length} of ${this.#tried} modules started, ${this.#failed.length} failed${ids} (${this.#versions()}); off: ${config} in config, ${window} for this window, ${this.#invalid.length} by options; undefined selectors: ${this.#undefinedCount}`;
  }
  #versions() {
    const vivarcdi = this.#build?.vivarcdiVersion ?? UNKNOWN;
    const vivaldi = this.#build?.vivaldiVersion ?? UNKNOWN;
    const selectors = this.#catalog === null ? UNKNOWN : this.#catalog.version ?? NONE;
    return `VivArcDi ${vivarcdi}, Vivaldi ${vivaldi}, selectors ${selectors}`;
  }
}
export {
  BOOT_NOTICE_KEY,
  BootReport,
  MARKING_MODULE,
  SEVERE_FAILURES,
  bootNoticeText
};
