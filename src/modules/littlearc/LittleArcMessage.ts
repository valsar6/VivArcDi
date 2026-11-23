export const LITTLE_ARC_MESSAGE_TYPE = 'vivarcdi-little-arc';
export const LITTLE_ARC_CONSOLE_PREFIX = 'vivarcdi-little-arc:';

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

export interface PageLinkPolicy {
  /** Secret that proves the click comes from an injected script. */
  token: string;
  /** Id of the tab whose page holds the link. */
  tabId: number;
}

export interface PageLinkMessage {
  type: typeof LITTLE_ARC_MESSAGE_TYPE;
  action: 'page-link';
  token: string;
  tabId: number;
  url: string;
}

/**
 * @param token Secret given to the injected scripts.
 * @param tabId The tab whose page holds the link.
 * @param url The address of the link.
 * @returns The message a page sends when a new-window link is clicked.
 */
export function pageLinkMessage(token: string, tabId: number, url: string): PageLinkMessage {
  return { type: LITTLE_ARC_MESSAGE_TYPE, action: 'page-link', token, tabId, url };
}

/**
 * @param value Anything received through `chrome.runtime.onMessage` or a page's console line.
 * @returns The message when it is a valid new-window link request, otherwise null.
 */
export function parsePageLinkMessage(value: unknown): PageLinkMessage | null {
  const candidate = typeof value === 'string' ? pageLinkFromConsole(value) : value;
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const message = candidate as Record<string, unknown>;
  return isPageLink(message) ? pageLinkMessage(message['token'] as string, message['tabId'] as number, message['url'] as string) : null;
}

function isPageLink(message: Record<string, unknown>): boolean {
  return (
    message['type'] === LITTLE_ARC_MESSAGE_TYPE &&
    message['action'] === 'page-link' &&
    typeof message['token'] === 'string' &&
    Number.isInteger(message['tabId']) &&
    typeof message['url'] === 'string'
  );
}

function pageLinkFromConsole(line: string): unknown {
  if (!line.startsWith(LITTLE_ARC_CONSOLE_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(line.slice(LITTLE_ARC_CONSOLE_PREFIX.length));
  } catch {
    return null;
  }
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
