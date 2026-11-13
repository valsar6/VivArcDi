import { dirname, relative, resolve, sep } from 'node:path';

const MODULES = ['src', 'modules'];
const SHARED = ['src', 'shared'];
const CORE = ['src', 'core'];

function startsWith(parts, prefix) {
  return prefix.every((part, index) => parts[index] === part);
}

function moduleOf(parts) {
  return startsWith(parts, MODULES) && parts.length > MODULES.length + 1 ? parts[MODULES.length] : undefined;
}

function violation(fileParts, targetParts) {
  if (startsWith(fileParts, CORE)) {
    return startsWith(targetParts, SHARED) || startsWith(targetParts, MODULES) ? 'coreToOuter' : undefined;
  }
  const targetModule = moduleOf(targetParts);
  if (targetModule === undefined) {
    return undefined;
  }
  if (startsWith(fileParts, SHARED)) {
    return 'sharedToModule';
  }
  const fileModule = moduleOf(fileParts);
  return fileModule !== undefined && fileModule !== targetModule ? 'otherModule' : undefined;
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep the layers apart: a module imports core, shared and its own files only; shared never imports a module; core imports core only' },
    schema: [],
    messages: {
      otherModule: 'A module cannot import another module. Move the shared piece to src/shared/.',
      sharedToModule: 'src/shared/ cannot import a module.',
      coreToOuter: 'src/core/ cannot import src/shared/ or a module.',
    },
  },
  create(context) {
    const root = context.cwd;
    const fileParts = relative(root, context.filename).split(sep);
    const check = (source) => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string' || !source.value.startsWith('.')) {
        return;
      }
      const targetParts = relative(root, resolve(dirname(context.filename), source.value)).split(sep);
      const messageId = violation(fileParts, targetParts);
      if (messageId !== undefined) {
        context.report({ node: source, messageId });
      }
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

export default { rules: { 'module-boundaries': rule } };
