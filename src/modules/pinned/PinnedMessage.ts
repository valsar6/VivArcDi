export const PINNED_MESSAGE_TYPE = 'vivarcdi-pinned';
export const PINNED_CONSOLE_PREFIX = 'vivarcdi-pinned:';

export interface PinnedMessage {
  /** Always `vivarcdi-pinned`. */
  type: typeof PINNED_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** The tab whose page sent it. */
  tabId: number;
  /** What the user asked. */
  action: 'close';
}

/**
 * Reads a message of the `pinned-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parsePinnedMessage(value: unknown): PinnedMessage | null {
  const candidate = typeof value === 'string' ? fromConsole(value) : value;
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const message = candidate as Record<string, unknown>;
  const valid =
    message['type'] === PINNED_MESSAGE_TYPE &&
    typeof message['token'] === 'string' &&
    typeof message['tabId'] === 'number' &&
    message['action'] === 'close';
  return valid ? (message as unknown as PinnedMessage) : null;
}

function fromConsole(line: string): unknown {
  if (!line.startsWith(PINNED_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(PINNED_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
