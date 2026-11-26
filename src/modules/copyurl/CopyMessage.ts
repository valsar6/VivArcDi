import { hasEnvelope, parsePageMessage } from '../../shared/messages/PageMessage.js';

export const COPY_MESSAGE_TYPE = 'vivarcdi-copy';
export const COPY_CONSOLE_PREFIX = 'vivarcdi-copy:';

export interface CopyMessage extends Record<string, unknown> {
  /** Always `vivarcdi-copy`. */
  type: typeof COPY_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** The tab whose page sent it. */
  tabId: number;
  /** What the user asked. */
  action: 'copy';
}

const isCopyMessage = (candidate: Record<string, unknown>): candidate is CopyMessage =>
  hasEnvelope(candidate, COPY_MESSAGE_TYPE) && typeof candidate['tabId'] === 'number' && candidate['action'] === 'copy';

/**
 * Reads a message of the `copy-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseCopyMessage(value: unknown): CopyMessage | null {
  return parsePageMessage(value, COPY_CONSOLE_PREFIX, isCopyMessage);
}
