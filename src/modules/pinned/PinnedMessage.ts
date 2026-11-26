import { hasEnvelope, parsePageMessage } from '../../shared/messages/PageMessage.js';

export const PINNED_MESSAGE_TYPE = 'vivarcdi-pinned';
export const PINNED_CONSOLE_PREFIX = 'vivarcdi-pinned:';

export interface PinnedMessage extends Record<string, unknown> {
  /** Always `vivarcdi-pinned`. */
  type: typeof PINNED_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** The tab whose page sent it. */
  tabId: number;
  /** What the user asked. */
  action: 'close';
}

const isPinnedMessage = (candidate: Record<string, unknown>): candidate is PinnedMessage =>
  hasEnvelope(candidate, PINNED_MESSAGE_TYPE) && typeof candidate['tabId'] === 'number' && candidate['action'] === 'close';

/**
 * Reads a message of the `pinned-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parsePinnedMessage(value: unknown): PinnedMessage | null {
  return parsePageMessage(value, PINNED_CONSOLE_PREFIX, isPinnedMessage);
}
