import { hasEnvelope, parsePageMessage } from '../../shared/messages/PageMessage.js';
import type { Disposition } from './LinkClassifier.js';

export const PEEK_MESSAGE_TYPE = 'vivarcdi-peek';
export const CONSOLE_PREFIX = 'vivarcdi-peek:';

export type PeekCommand = 'close' | 'expand';

interface Envelope extends Record<string, unknown> {
  type: typeof PEEK_MESSAGE_TYPE;
  /** Secret given to injected scripts, so pages cannot forge messages. */
  token: string;
}

export type PeekMessage = Envelope &
  ({ action: 'open'; url: string; tabId: number; disposition: Disposition } | { action: 'command'; command: PeekCommand });

const DISPOSITIONS = new Set<unknown>(['new-window', 'new-tab', 'same-tab']);
const COMMANDS = new Set<unknown>(['close', 'expand']);

const isPeekMessage = (candidate: Record<string, unknown>): candidate is PeekMessage =>
  hasEnvelope(candidate, PEEK_MESSAGE_TYPE) && (isOpen(candidate) || isCommand(candidate));

/**
 * Reads a message sent by a script that VivArcDi injected into a page.
 *
 * @param value A runtime message, or a console line starting with the Peek prefix.
 * @returns The message, or null when the value is not a valid Peek message.
 */
export function parsePeekMessage(value: unknown): PeekMessage | null {
  return parsePageMessage(value, CONSOLE_PREFIX, isPeekMessage);
}

function isOpen(message: Record<string, unknown>): boolean {
  return (
    message['action'] === 'open' &&
    typeof message['url'] === 'string' &&
    typeof message['tabId'] === 'number' &&
    DISPOSITIONS.has(message['disposition'])
  );
}

function isCommand(message: Record<string, unknown>): boolean {
  return message['action'] === 'command' && COMMANDS.has(message['command']);
}
