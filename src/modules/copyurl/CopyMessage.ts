export const COPY_MESSAGE_TYPE = 'vivarcdi-copy';
export const COPY_CONSOLE_PREFIX = 'vivarcdi-copy:';

export interface CopyMessage {
  /** Always `vivarcdi-copy`. */
  type: typeof COPY_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** The tab whose page sent it. */
  tabId: number;
  /** What the user asked. */
  action: 'copy';
}

/**
 * Reads a message of the `copy-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseCopyMessage(value: unknown): CopyMessage | null {
  const candidate = typeof value === 'string' ? fromConsole(value) : value;
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const message = candidate as Record<string, unknown>;
  const valid =
    message['type'] === COPY_MESSAGE_TYPE &&
    typeof message['token'] === 'string' &&
    typeof message['tabId'] === 'number' &&
    message['action'] === 'copy';
  return valid ? (message as unknown as CopyMessage) : null;
}

function fromConsole(line: string): unknown {
  if (!line.startsWith(COPY_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(COPY_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
