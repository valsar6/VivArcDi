import { hasEnvelope, parsePageMessage } from '../../shared/messages/PageMessage.js';

export const ARCHIVE_MESSAGE_TYPE = 'vivarcdi-archive';
export const ARCHIVE_CONSOLE_PREFIX = 'vivarcdi-archive:';

export interface ArchiveMessage extends Record<string, unknown> {
  /** Always `vivarcdi-archive`. */
  type: typeof ARCHIVE_MESSAGE_TYPE;
  /** Secret that proves the message comes from the injected script. */
  token: string;
  /** What the user asked. */
  action: 'open' | 'clear';
}

const isArchiveMessage = (candidate: Record<string, unknown>): candidate is ArchiveMessage =>
  hasEnvelope(candidate, ARCHIVE_MESSAGE_TYPE) && (candidate['action'] === 'open' || candidate['action'] === 'clear');

/**
 * Reads a message of the `archive-keys` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseArchiveMessage(value: unknown): ArchiveMessage | null {
  return parsePageMessage(value, ARCHIVE_CONSOLE_PREFIX, isArchiveMessage);
}
