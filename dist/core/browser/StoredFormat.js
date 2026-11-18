const VERSION_MEMBER = "vivarcdi:version";
const DATA_MEMBER = "vivarcdi:data";
const isEnvelope = (parsed) => {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return false;
  }
  const names = Object.keys(parsed);
  return names.length === 2 && names.includes(VERSION_MEMBER) && names.includes(DATA_MEMBER);
};
class StoredFormat {
  #rules;
  #version;
  /**
   * The format of one stored value: its upgrade steps, its empty value and its shape check.
   *
   * @param rules The rules of the store.
   */
  constructor(rules) {
    this.#rules = rules;
    this.#version = (rules.upgrades?.length ?? 0) + 1;
  }
  /** @returns The version the store writes: the number of upgrade steps plus one. */
  get version() {
    return this.#version;
  }
  /**
   * Reads a saved text. Never throws and never writes.
   *
   * @param text The saved text, or null.
   * @returns The status and the value; `empty` and `unreadable` carry the empty value.
   */
  decode(text) {
    if (text === null) {
      return this.#result("empty", this.#rules.empty, false);
    }
    const parsed = this.#parse(text);
    if (parsed === null) {
      return this.#result("unreadable", this.#rules.empty, false);
    }
    if (parsed.version > this.#version) {
      const readout = this.#rules.read(parsed.data);
      return this.#result("newer", readout?.value ?? this.#rules.empty, readout?.skipped ?? false);
    }
    return this.#current(parsed);
  }
  /**
   * @param value The store's value.
   * @returns The text to save: bare at version 1, in an envelope from version 2.
   */
  encode(value) {
    if (this.#version === 1) {
      return JSON.stringify(value);
    }
    return JSON.stringify({ [VERSION_MEMBER]: this.#version, [DATA_MEMBER]: value });
  }
  #result(status, value, skipped) {
    return { status, value, skipped };
  }
  #parse(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    if (!isEnvelope(parsed)) {
      return { version: 1, data: parsed };
    }
    const version = parsed[VERSION_MEMBER];
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return null;
    }
    return { version, data: parsed[DATA_MEMBER] };
  }
  #current(parsed) {
    const upgraded = this.#upgrade(parsed);
    const readout = upgraded === null ? null : this.#rules.read(upgraded.data);
    if (readout === null) {
      return this.#result("unreadable", this.#rules.empty, false);
    }
    return this.#result("current", readout.value, readout.skipped);
  }
  #upgrade(parsed) {
    let data = parsed.data;
    try {
      for (const step of (this.#rules.upgrades ?? []).slice(parsed.version - 1)) {
        data = step(data);
      }
    } catch {
      return null;
    }
    return { data };
  }
}
export {
  DATA_MEMBER,
  StoredFormat,
  VERSION_MEMBER
};
