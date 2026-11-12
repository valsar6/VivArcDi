import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const MODULES = join(SRC, 'modules');
const SHARED = join(SRC, 'shared');
const CORE = join(SRC, 'core');
const LOADER = join(SRC, 'loader.ts');
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)['"](\.[^'"]*)['"]/g;

interface Edge {
  from: string;
  to: string;
}

const typescriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(path);
    }
    return entry.name.endsWith('.ts') ? [path] : [];
  });

const resolved = (file: string, specifier: string): string =>
  resolve(dirname(file), specifier).replace(/\.js$/, '.ts');

const edgesOf = (file: string): Edge[] =>
  [...readFileSync(file, 'utf8').matchAll(SPECIFIER)].map((match) => ({ from: file, to: resolved(file, match[1] ?? '') }));

const allEdges = (): Edge[] => typescriptFiles(SRC).flatMap(edgesOf);

const inside = (path: string, directory: string): boolean => path.startsWith(directory + sep);

const moduleOf = (path: string): string | undefined => {
  if (!inside(path, MODULES)) {
    return undefined;
  }
  const [name, ...rest] = relative(MODULES, path).split(sep);
  return rest.length > 0 ? name : undefined;
};

const shown = (path: string): string => relative(ROOT, path);

const usersOf = (shared: string, edges: Edge[], seen: Set<string>): Set<string> => {
  const users = new Set<string>();
  seen.add(shared);
  for (const edge of edges.filter((candidate) => candidate.to === shared)) {
    const name = moduleOf(edge.from);
    if (name !== undefined) {
      users.add(name);
    } else if (inside(edge.from, SHARED) && !seen.has(edge.from)) {
      usersOf(edge.from, edges, seen).forEach((user) => users.add(user));
    }
  }
  return users;
};

test('no module imports another module', () => {
  const offending = allEdges()
    .filter((edge) => {
      const source = moduleOf(edge.from);
      const target = moduleOf(edge.to);
      return source !== undefined && target !== undefined && source !== target;
    })
    .map((edge) => `${shown(edge.from)} -> ${shown(edge.to)}`);
  assert.deepEqual(offending, []);
});

test('shared imports only core and shared', () => {
  const offending = allEdges()
    .filter((edge) => inside(edge.from, SHARED) && !inside(edge.to, CORE) && !inside(edge.to, SHARED))
    .map((edge) => `${shown(edge.from)} -> ${shown(edge.to)}`);
  assert.deepEqual(offending, []);
});

test('every shared file is used by two modules', () => {
  const edges = allEdges();
  const offending = typescriptFiles(SHARED)
    .map((file) => ({ file, users: usersOf(file, edges, new Set()) }))
    .filter(({ users }) => users.size < 2)
    .map(({ file, users }) => `${shown(file)} is used by ${[...users].join(', ') || 'no module'}`);
  assert.deepEqual(offending, []);
});

test('folders keeps only the module and the section at its top level', () => {
  const top = readdirSync(join(MODULES, 'folders'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(top, ['BookmarkFolders.ts', 'FolderSection.ts']);
});

test('core imports only core', () => {
  const offending = allEdges()
    .filter((edge) => inside(edge.from, CORE) && !inside(edge.to, CORE))
    .map((edge) => `${shown(edge.from)} -> ${shown(edge.to)}`);
  assert.deepEqual(offending, []);
});

test('every core file is used by core or by two modules', () => {
  const edges = allEdges();
  const usedByCore = new Set(
    edges.filter((edge) => inside(edge.from, CORE) || edge.from === LOADER).map((edge) => edge.to),
  );
  const offending = typescriptFiles(CORE)
    .filter((file) => !usedByCore.has(file))
    .map((file) => ({ file, users: usersOf(file, edges, new Set()) }))
    .filter(({ users }) => users.size < 2)
    .map(({ file, users }) => `${shown(file)} is used by ${[...users].join(', ') || 'no module'}`);
  assert.deepEqual(offending, []);
});

test('core keeps no file at its top level', () => {
  const top = readdirSync(CORE, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  assert.deepEqual(top, []);
});
