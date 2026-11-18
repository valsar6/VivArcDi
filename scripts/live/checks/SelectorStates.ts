import type { Driver } from '../Driver.js';

export interface SelectorState {
  enter(driver: Driver): Promise<void>;
  leave(driver: Driver): Promise<void>;
}

export interface NotChecked {
  notChecked: string;
}

export type StateMap = Record<string, string | NotChecked>;

export const DEFAULT_STATE = 'default';

const closeWithEscape = async (driver: Driver): Promise<void> => driver.press('Escape');

const setActivePinned = (pinned: boolean): string =>
  `chrome.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => chrome.tabs.update(tab.id, { pinned: ${pinned} }))`;

/**
 * The interface states some selectors need, each with the way into it and back out.
 */
export const SELECTOR_STATES: Record<string, SelectorState> = {
  [DEFAULT_STATE]: { enter: () => Promise.resolve(), leave: () => Promise.resolve() },
  'pinned-tab': {
    enter: async (driver) => {
      await driver.evaluate(setActivePinned(true));
      await driver.waitForElement(driver.selector('pinnedTab'));
    },
    leave: async (driver) => {
      await driver.evaluate(setActivePinned(false));
    },
  },
  'workspace-popup': {
    enter: async (driver) => {
      await driver.click(driver.selector('workspaceButton'));
      await driver.waitForElement(driver.selector('workspacePopup'));
    },
    leave: closeWithEscape,
  },
  'workspace-editor': {
    enter: async (driver) => {
      await SELECTOR_STATES['workspace-popup']?.enter(driver);
      await driver.click(driver.selector('workspaceCreate'));
      await driver.waitForElement(driver.selector('workspaceForm'));
    },
    leave: async (driver) => {
      await closeWithEscape(driver);
      await closeWithEscape(driver);
    },
  },
};
