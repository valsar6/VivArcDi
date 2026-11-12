import type { ESLint } from 'eslint';

declare const plugin: Required<Pick<ESLint.Plugin, 'rules'>>;
export default plugin;
