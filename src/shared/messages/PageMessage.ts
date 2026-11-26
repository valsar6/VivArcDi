/**
 * Reads a message sent by a script that VivArcDi injected into a page.
 *
 * @param value A runtime message, or a console line starting with `prefix`.
 * @param prefix The console prefix of the message kind.
 * @param isMessage Accepts the object when it has the fields of the message.
 * @returns The message, or null when the value is not one. It never throws.
 */
export function parsePageMessage<T extends Record<string, unknown>>(
  value: unknown,
  prefix: string,
  isMessage: (candidate: Record<string, unknown>) => candidate is T,
): T | null {
  const parsed = typeof value === 'string' ? fromConsole(value, prefix) : value;
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const candidate: Record<string, unknown> = { ...parsed };
  return isMessage(candidate) ? candidate : null;
}

/**
 * Checks the two fields every page message carries.
 *
 * @param candidate The object to check.
 * @param type The message type of the kind.
 * @returns True when the type matches and the token is a string.
 */
export function hasEnvelope(candidate: Record<string, unknown>, type: string): boolean {
  return candidate['type'] === type && typeof candidate['token'] === 'string';
}

function fromConsole(line: string, prefix: string): unknown {
  if (!line.startsWith(prefix)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(prefix.length));
  } catch {
    return null;
  }
}
