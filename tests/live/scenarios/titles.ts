import type { Driver } from '../../../scripts/live/Driver.js';
import { SETTLE_MS } from './column.js';

export async function openTodayTab(driver: Driver): Promise<void> {
  await driver.evaluate(`chrome.tabs.create({ url: 'about:blank#today-title', active: false })`);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

export async function addLinkRow(driver: Driver): Promise<void> {
  await driver.evaluate(`(() => {
    const section = document.querySelector('[data-vivarcdi-folders]');
    section.removeAttribute('data-vivarcdi-empty');
    section.removeAttribute('hidden');
    const row = document.createElement('div');
    row.setAttribute('role', 'link');
    row.setAttribute('data-live-link', '');
    const icon = document.createElement('img');
    icon.className = 'vivarcdi-folders-icon';
    icon.alt = '';
    const title = document.createElement('span');
    title.className = 'vivarcdi-folders-title';
    title.textContent = 'Link row';
    row.append(icon, title);
    section.append(row);
  })()`);
  await driver.waitFor(`getComputedStyle(document.querySelector('[data-live-link]')).display === 'flex'`);
}

export const READ_TITLES = `(() => {
  const header = [...document.querySelectorAll('.tab-header')].find((node) => node.querySelector('.title') && node.getBoundingClientRect().height > 0 && node.closest('.tab-position:not(.is-pinned)'));
  const link = document.querySelector('[data-live-link]');
  if (!header || !link) {
    throw new Error('the Today tab or the link row is missing');
  }
  const title = header.querySelector('.title');
  const icon = header.querySelector('.favicon img') ?? header.querySelector('.favicon');
  const linkTitle = link.querySelector('.vivarcdi-folders-title');
  const linkIcon = link.querySelector('.vivarcdi-folders-icon');
  const box = (node) => node.getBoundingClientRect();
  const look = (node) => {
    const style = getComputedStyle(node);
    return { size: style.fontSize, weight: style.fontWeight, color: style.color };
  };
  const middle = (node) => box(node).top + box(node).height / 2;
  const textMiddle = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return box(range).top + box(range).height / 2;
  };
  const titleStyle = getComputedStyle(title);
  return {
    today: look(title),
    link: look(linkTitle),
    centerOffset: textMiddle(title) - middle(icon),
    todayGap: box(title).left + parseFloat(titleStyle.paddingLeft) - box(icon).right,
    linkGap: box(linkTitle).left - box(linkIcon).right,
    overflow: titleStyle.textOverflow,
    whiteSpace: titleStyle.whiteSpace,
    hidden: titleStyle.overflowX,
    transition: titleStyle.transitionProperty,
  };
})()`;

export interface TitleReading {
  today: { size: string; weight: string; color: string };
  link: { size: string; weight: string; color: string };
  centerOffset: number;
  todayGap: number;
  linkGap: number;
  overflow: string;
  whiteSpace: string;
  hidden: string;
  transition: string;
}
