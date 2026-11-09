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

export interface DestinationColors {
  space: string;
  pill: string;
  ink: string;
}

export interface DestinationQuestion {
  type: typeof LITTLE_ARC_MESSAGE_TYPE;
  action: 'destination';
}

export interface DestinationAnswer {
  type: typeof LITTLE_ARC_MESSAGE_TYPE;
  action: 'destination-answer';
  name: string | null;
  colors: DestinationColors | null;
}

/**
 * @returns The message a Little Arc window sends when its bar mounts, to learn the destination workspace.
 */
export function destinationQuestion(): DestinationQuestion {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: 'destination' };
}

/**
 * @param value Anything received through `chrome.runtime.onMessage`.
 * @returns Whether it is the question of a Little Arc window about the destination workspace.
 */
export function isDestinationQuestion(value: unknown): boolean {
  const { type, action } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return type === LITTLE_ARC_MESSAGE_TYPE && action === 'destination';
}

/**
 * @param name The name of the workspace that would receive the page, or null when it is not known.
 * @param colors The colors of that workspace, or null for the default palette.
 * @returns The answer of the main window.
 */
export function destinationAnswer(name: string | null, colors: DestinationColors | null): DestinationAnswer {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: 'destination-answer', name, colors };
}

function parseColors(value: unknown): DestinationColors | null {
  const { space, pill, ink } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return typeof space === 'string' && typeof pill === 'string' && typeof ink === 'string' ? { space, pill, ink } : null;
}

/**
 * @param value Anything received through `chrome.runtime.onMessage`.
 * @returns The answer when it is a valid one, otherwise null.
 */
export function parseDestinationAnswer(value: unknown): DestinationAnswer | null {
  const { type, action, name, colors } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  if (type !== LITTLE_ARC_MESSAGE_TYPE || action !== 'destination-answer') {
    return null;
  }
  return destinationAnswer(typeof name === 'string' ? name : null, parseColors(colors));
}
