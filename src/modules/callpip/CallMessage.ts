export const CALL_MESSAGE_TYPE = 'vivarcdi-call-pip';
export const CALL_CONSOLE_PREFIX = 'vivarcdi-call-pip:';

export type CallWarning = 'unsupported-page' | 'request-failed';

export interface CallPagePolicy {
  /** Secret that proves a message comes from this script. */
  token: string;
  /** The tab of this page. */
  tabId: number;
  /** The letter of the Cmd/Ctrl+Shift shortcut. */
  letter: string;
  /** Selector that matches only while the page shows a call in progress. */
  inCallSelector: string;
}

export interface CallMessage {
  /** Always `vivarcdi-call-pip`. */
  type: typeof CALL_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** The tab whose page sent it. */
  tabId: number;
  /** What the page found wrong. */
  reason: CallWarning;
}

const REASONS: readonly unknown[] = ['unsupported-page', 'request-failed'];

/**
 * Reads a message of the `call-pip` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseCallMessage(value: unknown): CallMessage | null {
  const candidate = typeof value === 'string' ? fromConsole(value) : value;
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const message = candidate as Record<string, unknown>;
  const valid =
    message['type'] === CALL_MESSAGE_TYPE &&
    typeof message['token'] === 'string' &&
    typeof message['tabId'] === 'number' &&
    REASONS.includes(message['reason']);
  return valid ? (message as unknown as CallMessage) : null;
}

function fromConsole(line: string): unknown {
  if (!line.startsWith(CALL_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(CALL_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
}
