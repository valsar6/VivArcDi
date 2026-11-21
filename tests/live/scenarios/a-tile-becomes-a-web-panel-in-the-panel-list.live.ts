import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';
import { SETTLE_MS } from './column.js';

const ADDRESS = 'https://example.com/';
const WAIT_MS = 10_000;

const press = (selector: string): string => `(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  const { x, y, width, height } = element.getBoundingClientRect();
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    const Kind = type.startsWith('pointer') ? PointerEvent : MouseEvent;
    element.dispatchEvent(new Kind(type, { bubbles: true, cancelable: true, view: window, button: 0, buttons: type.endsWith('down') ? 1 : 0, clientX: x + width / 2, clientY: y + height / 2 }));
  }
})()`;

const scenario: Scenario = {
  name: 'a tile becomes a web panel in the panel list',
  spec: '055',
  run: async (driver) => {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const buttons = driver.selector('webPanelButton');
    const count = `document.querySelectorAll(${JSON.stringify(buttons)}).length`;
    const before = await driver.evaluate<number>(count);
    await driver.evaluate(press(driver.selector('panelAddButton')));
    await driver.waitForElement(driver.selector('panelAddressField'));
    await driver.evaluate(`(() => {
      const field = document.querySelector(${JSON.stringify(driver.selector('panelAddressField'))});
      Reflect.set(Object.getPrototypeOf(field), 'value', ${JSON.stringify(ADDRESS)}, field);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await driver.evaluate(press(driver.selector('panelAddSubmit')));
    await driver.waitFor(`${count} === ${before + 1}`, WAIT_MS);
    const listed = await driver.evaluate<boolean>(`new Promise((resolve) => vivaldi.prefs.get('vivaldi.panels.web.elements', (result) => resolve(result.value.some((panel) => panel.url === ${JSON.stringify(ADDRESS)}))))`);
    if (!listed) {
      throw new Error(`the panel of ${ADDRESS} is in the bar but not in vivaldi.panels.web.elements`);
    }
  },
};

export default scenario;
