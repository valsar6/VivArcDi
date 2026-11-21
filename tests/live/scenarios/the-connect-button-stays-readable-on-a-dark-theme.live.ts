import type { Scenario } from '../../../scripts/live/scenarios/ScenarioCatalog.js';

const MIN_CONTRAST = 4.5;
const MARK = 'data-vivarcdi-live-contrast';
const THEMES: Array<[string, string, string]> = [
  ['dark theme with a light accent', '#ffffff', '#1a1a1a'],
  ['dark theme with a pale accent', '#f2c9ff', '#2b0a33'],
  ['dark theme with a deep accent', '#7a1f4a', '#ffffff'],
];

type Rgba = [number, number, number, number];

function luminance([red, green, blue]: Rgba): number {
  const [r = 0, g = 0, b = 0] = [red, green, blue].map((channel) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first: Rgba, second: Rgba): number {
  const [light = 0, dark = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const scenario: Scenario = {
  name: 'the connect button stays readable on a dark theme',
  spec: '026',
  run: async (driver) => {
    await driver.evaluate(`(() => {
      const panel = document.createElement('div');
      panel.setAttribute('data-vivarcdi-connect-panel', '');
      panel.setAttribute(${JSON.stringify(MARK)}, '');
      const button = document.createElement('button');
      button.setAttribute('data-vivarcdi-connect-primary', '');
      button.textContent = 'Copy code and open GitHub';
      panel.append(button);
      document.querySelector('#browser').append(panel);
    })()`);
    try {
      for (const [theme, background, label] of THEMES) {
        const [text, paint] = await driver.evaluate<[Rgba, Rgba]>(`(() => {
          const browser = document.querySelector('#browser');
          browser.style.setProperty('--colorHighlightBg', ${JSON.stringify(background)});
          browser.style.setProperty('--colorHighlightFg', ${JSON.stringify(label)});
          const style = getComputedStyle(document.querySelector('[${MARK}] button'));
          const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const rgba = (value) => { canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1); return [...canvas.getImageData(0, 0, 1, 1).data]; };
          return [rgba(style.color), rgba(style.backgroundColor)];
        })()`);
        const ratio = contrast(text, paint);
        if (ratio < MIN_CONTRAST) {
          throw new Error(`${theme}: the label of the main button has a contrast of ${ratio.toFixed(2)}:1, under ${MIN_CONTRAST}:1`);
        }
      }
    } finally {
      await driver.evaluate(`(() => {
        document.querySelector('[${MARK}]')?.remove();
        document.querySelector('#browser').style.removeProperty('--colorHighlightBg');
        document.querySelector('#browser').style.removeProperty('--colorHighlightFg');
      })()`);
    }
  },
};

export default scenario;
