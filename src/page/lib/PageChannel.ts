import { CONSOLE_PREFIX } from '../../modules/peek/PeekMessage.js';
import type { PeekMessage } from '../../modules/peek/PeekMessage.js';

type SendMessage = (value: unknown) => void;

/**
 * Sends a message from a script injected into a page to Vivaldi's interface.
 * Uses `chrome.runtime.sendMessage` when the injected script has it, otherwise a
 * prefixed console line that the interface reads from the webview's `consolemessage` event.
 *
 * @param message The message to send.
 */
export function sendToInterface(message: PeekMessage): void {
  if (!sendThroughRuntime(message)) {
    console.debug(`${CONSOLE_PREFIX}${JSON.stringify(message)}`);
  }
}

function sendThroughRuntime(message: PeekMessage): boolean {
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
