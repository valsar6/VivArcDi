import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Mapping = { rule: 'equals' | 'in' | 'extends'; name: string } | { rule: 'style only' };
type Catalog = Record<string, string>;

const STYLES = fileURLToPath(new URL('../../src/styles/', import.meta.url));
const SELECTORS = fileURLToPath(new URL('../../src/selectors/', import.meta.url));
const read = (path: string): string => readFileSync(path, 'utf8');
const ONLY: Mapping = { rule: 'style only' };

const MAPPING: Record<string, Mapping> = {
  browser: { rule: 'equals', name: 'browser' },
  'tabs-container': { rule: 'equals', name: 'tabsContainer' },
  'tab-bar': { rule: 'equals', name: 'verticalTabBar' },
  'narrow-tab-bar': { rule: 'extends', name: 'tabBar' },
  strip: { rule: 'equals', name: 'tabStrip' },
  panels: { rule: 'in', name: 'panelAddButton' },
  'tab-strip': { rule: 'in', name: 'tabStrip' },
  resize: { rule: 'in', name: 'tabStripFrame' },
  'tab-position': { rule: 'in', name: 'pinnedTab' },
  'is-pinned': { rule: 'in', name: 'pinnedTab' },
  'pinned-tab': { rule: 'equals', name: 'pinnedTab' },
  'pinned-group': { rule: 'equals', name: 'pinnedGroup' },
  'tab-wrapper': { rule: 'equals', name: 'tabWrapper' },
  'tab-header': { rule: 'in', name: 'tabClose' },
  close: { rule: 'in', name: 'tabClose' },
  favicon: { rule: 'in', name: 'tabFavicon' },
  'button-toolbar': { rule: 'in', name: 'newTabButton' },
  'new-tab-button': { rule: 'equals', name: 'newTabButton' },
  'auto-hide-wrapper': { rule: 'equals', name: 'autoHideWrapper' },
  tab: ONLY,
  active: ONLY,
  title: ONLY,
  'tab-audio': ONLY,
  'stack-counter': ONLY,
  'svg-tab-selection': ONLY,
  'page-progress-indicator': ONLY,
  'button-badge': ONLY,
  'panels-container': ONLY,
  switch: ONLY,
  'auto-hide': ONLY,
  'toolbar-spacer': ONLY,
  'toolbar-spacer-flexible': ONLY,
  'tabbar-nested-buttons': ONLY,
};

const variablesOf = (source: string): Record<string, string> => {
  const found: Record<string, string> = {};
  for (const line of source.split('\n')) {
    const match = /^\$([a-z-]+): '([^']*)';$/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) found[match[1]] = match[2];
  }
  return found;
};

const holds = (mapping: Mapping, value: string, selector: string): boolean => {
  if (mapping.rule === 'equals') return value === selector;
  if (mapping.rule === 'in') return selector.includes(value);
  if (mapping.rule === 'extends') return value.startsWith(selector);
  return true;
};

const problemsOf = (catalogs: Record<string, Catalog>, variables: Record<string, string>): string[] => {
  const problems: string[] = [];
  for (const [version, catalog] of Object.entries(catalogs)) {
    for (const [variable, mapping] of Object.entries(MAPPING)) {
      if (mapping.rule === 'style only') continue;
      const selector = catalog[mapping.name];
      const value = variables[variable];
      if (selector === undefined) problems.push(`${version}: ${mapping.name} is missing for $${variable}`);
      else if (value === undefined) problems.push(`${version}: $${variable} is not defined`);
      else if (!holds(mapping, value, selector)) problems.push(`${version}: $${variable} (${value}) is not ${mapping.rule} ${mapping.name} (${selector})`);
    }
  }
  return problems;
};

const catalogs = (): Record<string, Catalog> => {
  const versions = (JSON.parse(read(`${SELECTORS}index.json`)) as { versions: string[] }).versions;
  return Object.fromEntries(versions.map((version) => [version, JSON.parse(read(`${SELECTORS}${version}.json`)) as Catalog]));
};

const others = (): string[] => readdirSync(STYLES).filter((name) => name.endsWith('.scss') && name !== '_vivaldi.scss');
const variables = (): Record<string, string> => variablesOf(read(`${STYLES}_vivaldi.scss`));

const literalsIn = (source: string, names: string[]): string[] => {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '');
  return names.filter((name) => {
    const body = name.slice(1);
    const pattern = name.startsWith('#') ? `(?<![\\w-])#${body}(?![\\w-])` : `(?<!\\d)\\.${body}(?![\\w-])`;
    return new RegExp(pattern).test(clean);
  });
};

test('_vivaldi.scss defines every Vivaldi name the styles use', () => {
  const defined = Object.keys(variables()).sort();
  assert.deepEqual(defined, Object.keys(MAPPING).sort());
  const sources = others().map((name) => read(`${STYLES}${name}`)).join('\n');
  for (const name of defined) {
    assert.ok(sources.includes(`#{$${name}}`) || sources.includes(`$${name}`), `$${name} is used`);
  }
});

test('every mirrored variable equals its catalog selector in every catalog', () => {
  assert.deepEqual(problemsOf(catalogs(), variables()), []);
});

test('a mirrored name missing in a catalog fails', () => {
  const real = catalogs()['8.1'] ?? {};
  const broken = Object.fromEntries(Object.entries(real).filter(([name]) => name !== 'tabWrapper'));
  broken['tabStrip'] = '#tabs-container .other-strip';
  const problems = problemsOf({ '8.1': broken }, variables());
  assert.ok(problems.some((line) => line.includes('8.1') && line.includes('tabWrapper')), problems.join('\n'));
  assert.ok(problems.some((line) => line.includes('8.1') && line.includes('tabStrip')), problems.join('\n'));
});

test('no stylesheet writes a Vivaldi name as a literal', () => {
  const names = [...new Set(Object.values(variables()).flatMap((value) => value.match(/[.#][A-Za-z][\w-]*/g) ?? []))];
  assert.ok(names.length > 0);
  assert.deepEqual(literalsIn('a { .tab-wrapper {} #browser {} }', names).sort(), ['#browser', '.tab-wrapper']);
  for (const file of others()) {
    assert.deepEqual(literalsIn(read(`${STYLES}${file}`), names), [], file);
  }
});
