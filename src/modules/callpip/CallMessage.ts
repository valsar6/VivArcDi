import { hasEnvelope, parsePageMessage } from '../../shared/messages/PageMessage.js';

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

export interface CallMessage extends Record<string, unknown> {
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

const isCallMessage = (candidate: Record<string, unknown>): candidate is CallMessage =>
  hasEnvelope(candidate, CALL_MESSAGE_TYPE) && typeof candidate['tabId'] === 'number' && REASONS.includes(candidate['reason']);

/**
 * Reads a message of the `call-pip` page script, sent through `chrome.runtime` or the console.
 *
 * @param value A runtime message or a console line.
 * @returns The message, or null when it is not one.
 */
export function parseCallMessage(value: unknown): CallMessage | null {
  return parsePageMessage(value, CALL_CONSOLE_PREFIX, isCallMessage);
}
