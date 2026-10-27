import { CONSOLE_PREFIX } from '../../modules/peek/PeekMessage.js';
import type { PeekMessage } from '../../modules/peek/PeekMessage.js';
import type { PinnedMessage } from '../../modules/pinned/PinnedMessage.js';

type SendMessage = (value: unknown) => void;

type InterfaceMessage = PeekMessage | PinnedMessage;

/**
 * Sends a message from a script injected into a page to Vivaldi's interface.
 * Uses `chrome.runtime.sendMessage` when the injected script has it, otherwise a
 * prefixed console line that the interface reads from the webview's `consolemessage` event.
 *
 * @param message The message to send.
 * @param consolePrefix Prefix of the console line, which tells the interface who sent it.
 */
export function sendToInterface(message: InterfaceMessage, consolePrefix: string = CONSOLE_PREFIX): void {
  if (!sendThroughRuntime(message)) {
    console.debug(`${consolePrefix}${JSON.stringify(message)}`);
  }
}

function sendThroughRuntime(message: InterfaceMessage): boolean {
  const scope = globalThis as { chrome?: { runtime?: { sendMessage?: SendMessage } } };
  const runtime = scope.chrome?.runtime;
  if (runtime?.sendMessage === undefined) {
    return false;
  }
  try {
    runtime.sendMessage(message);
    return true;
  } catch {
    return false;
  }
}
