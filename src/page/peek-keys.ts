import { commandFor } from '../modules/peek/PeekKeyMap.js';
import { PEEK_MESSAGE_TYPE } from '../modules/peek/PeekMessage.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTANCE_KEY = Symbol.for('vivarcdi.peek.keys');

/**
 * Forwards Esc, Cmd/Ctrl+W and Cmd/Ctrl+O from the Peek page to Vivaldi's interface,
 * which would otherwise never see them while the page has the focus.
 *
 * @param token Secret that proves a message comes from the injected script.
 */
export function install(token: string): void {
  const registry = globalThis as unknown as Record<symbol, boolean | undefined>;
  if (registry[INSTANCE_KEY]) {
    return;
  }
  registry[INSTANCE_KEY] = true;
  globalThis.addEventListener(
    'keydown',
    (event) => {
      const command = commandFor(event);
      if (command !== null) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: PEEK_MESSAGE_TYPE, token, action: 'command', command });
      }
    },
    true,
  );
}
