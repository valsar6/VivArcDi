export const ARCHIVE_MESSAGE_TYPE = 'vivarcdi-archive';
export const ARCHIVE_CONSOLE_PREFIX = 'vivarcdi-archive:';

export interface ArchiveMessage {
  /** Always `vivarcdi-archive`. */
  type: typeof ARCHIVE_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** What the user asked. */
  action: 'open';
}

/**
 * Reads a message of the `archive-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseArchiveMessage(value: unknown): ArchiveMessage | null {
  const candidate = typeof value === 'string' ? fromConsole(value) : value;
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const message = candidate as Record<string, unknown>;
  const valid = message['type'] === ARCHIVE_MESSAGE_TYPE && typeof message['token'] === 'string' && message['action'] === 'open';
  return valid ? (message as unknown as ArchiveMessage) : null;
}

function fromConsole(line: string): unknown {
  if (!line.startsWith(ARCHIVE_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(ARCHIVE_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
