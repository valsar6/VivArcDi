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

const setActivePinned = (pinned: boolean): string =>
  `chrome.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => chrome.tabs.update(tab.id, { pinned: ${pinned} }))`;

const CLOSE_WAIT_MS = 1_000;

async function openWorkspacePopup(driver: Driver): Promise<void> {
  const popup = driver.selector('workspacePopup');
  if (!(await driver.exists(popup))) {
    await driver.click(driver.selector('workspaceButton'));
  }
  await driver.waitForElement(popup);
}

async function closeWorkspacePopup(driver: Driver): Promise<void> {
  const absent = `!document.querySelector(${JSON.stringify(driver.selector('workspacePopup'))})`;
  await driver.press('Escape');
  const closed = await driver.waitFor(absent, CLOSE_WAIT_MS).then(() => true, () => false);
  if (!closed) {
    await driver.click(driver.selector('workspaceButton'));
    await driver.waitFor(absent);
  }
}

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
  'workspace-popup': { enter: openWorkspacePopup, leave: closeWorkspacePopup },
  'workspace-editor': {
    enter: async (driver) => {
      await openWorkspacePopup(driver);
      await driver.click(driver.selector('workspaceCreate'));
      await driver.waitForElement(driver.selector('workspaceForm'));
    },
    leave: closeWorkspacePopup,
  },
};
