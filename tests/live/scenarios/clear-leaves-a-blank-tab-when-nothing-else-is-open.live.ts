import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const CLEAR = '[data-vivarcdi-clear]';

const scenario: Scenario = {
  name: 'Clear leaves a blank tab when nothing else is open',
  spec: '071',
  run: async (driver) => {
    const ids = await driver.evaluate<number[]>(`(async () => {
      const one = await chrome.tabs.create({ url: 'file:///etc/hosts' });
      const two = await chrome.tabs.create({ url: 'file:///etc/shells' });
      await chrome.tabs.update(two.id, { active: true });
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (active !== undefined && active.id === two.id) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const others = (await chrome.tabs.query({ currentWindow: true })).filter((tab) => tab.id !== one.id && tab.id !== two.id);
      await chrome.tabs.remove(others.map((tab) => tab.id));
      return [one.id, two.id];
    })()`);
    await driver.waitForElement(CLEAR);
    const workspaceOf = `(tab) => { try { return JSON.parse(tab.vivExtData || '{}').workspaceId ?? null; } catch { return null; } }`;
    const workspace = await driver.evaluate<unknown>(`chrome.tabs.get(${ids[1]}).then(${workspaceOf})`);
    await driver.evaluate(`document.querySelector(${JSON.stringify(driver.selector('addressField'))}).focus()`);
    await driver.press('k', ['Meta', 'Shift']);
    const left = await driver.evaluate<Array<{ id: number; active: boolean; workspace: unknown }>>(`(async () => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const open = await chrome.tabs.query({ currentWindow: true });
        if (open.length === 1 && !${JSON.stringify(ids)}.includes(open[0].id)) {
          return open.map((tab) => ({ id: tab.id, active: tab.active, workspace: (${workspaceOf})(tab) }));
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return (await chrome.tabs.query({ currentWindow: true })).map((tab) => ({ id: tab.id, active: tab.active, workspace: (${workspaceOf})(tab) }));
    })()`);
    const [blank] = left;
    if (left.length !== 1 || blank === undefined || ids.includes(blank.id)) {
      throw new Error(`expected one blank tab after Clear, found ${JSON.stringify(left)}`);
    }
    if (!blank.active) {
      throw new Error('the blank tab is not active');
    }
    if (blank.workspace !== workspace) {
      throw new Error(`the blank tab is in workspace ${String(blank.workspace)}, not ${String(workspace)}`);
    }
  },
};

export default scenario;
