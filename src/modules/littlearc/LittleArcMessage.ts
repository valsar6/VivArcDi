export const LITTLE_ARC_MESSAGE_TYPE = 'vivarcdi-little-arc';

export interface AdoptMessage {
  type: typeof LITTLE_ARC_MESSAGE_TYPE;
  action: 'adopt';
  tabId: number;
  windowId: number;
}

/**
 * @param tabId The tab of the Little Arc window.
 * @param windowId The Little Arc window.
 * @returns The message that asks the main window to take the tab.
 */
export function adoptMessage(tabId: number, windowId: number): AdoptMessage {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: 'adopt', tabId, windowId };
}

/**
 * @param value Anything received through `chrome.runtime.onMessage`.
 * @returns The message when it is a valid adopt request, otherwise null.
 */
export function parseAdoptMessage(value: unknown): AdoptMessage | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { type, action, tabId, windowId } = value as Record<string, unknown>;
  if (type !== LITTLE_ARC_MESSAGE_TYPE || action !== 'adopt' || !Number.isInteger(tabId) || !Number.isInteger(windowId)) {
    return null;
  }
  return adoptMessage(tabId as number, windowId as number);
}
