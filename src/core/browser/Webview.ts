export interface WebviewElement extends HTMLElement {
  src: string;
  executeScript(details: { code: string }, callback?: (results: unknown) => void): void;
}

export interface LoadCommitEvent extends Event {
  url: string;
  isTopLevel: boolean;
}

export interface ConsoleMessageEvent extends Event {
  message: string;
}

export interface NewWindowEvent extends Event {
  targetUrl: string;
}

export const TAB_ID_ATTRIBUTE = 'tab_id';

/**
 * @param webview A tab webview of Vivaldi's interface.
 * @returns The id of the tab it shows, or null when it has none.
 */
export function tabIdOf(webview: Element): number | null {
  const tabId = Number(webview.getAttribute(TAB_ID_ATTRIBUTE));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}
