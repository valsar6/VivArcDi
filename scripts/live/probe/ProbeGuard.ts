const WRITE_CALLS: Array<[string, RegExp]> = [
  ['chrome.storage write', /\bstorage\s*\.\s*(local|sync|session)\s*\.\s*(set|remove|clear)\b/],
  ['chrome.bookmarks write', /\bbookmarks\s*\.\s*(create|update|move|remove|removeTree)\b/],
  ['vivaldi.prefs write', /\bprefs\s*\.\s*set\b/],
  ['localStorage write', /\blocalStorage\s*\.\s*(setItem|removeItem|clear)\b/],
];

export class ProbeGuard {
  /**
   * Finds calls that write user data in a probe's source. Probes are read-only by contract; this
   * catches mistakes, not intent.
   *
   * @param source Probe source code.
   * @returns The kinds of write calls found; empty when the probe is read-only.
   */
  public static writeCalls(source: string): string[] {
    return WRITE_CALLS.filter(([, pattern]) => pattern.test(source)).map(([kind]) => kind);
  }
}
