import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import noLineComments from './tools/eslint/no-line-comments.mjs';

const sourceRules = {
  'local/no-line-comments': 'error',
  complexity: ['error', 8],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
  'max-params': ['error', 4],
  'max-depth': ['error', 3],
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  '@typescript-eslint/no-magic-numbers': [
    'error',
    { ignore: [-1, 0, 1, 2], ignoreDefaultValues: true, ignoreClassFieldInitialValues: true, ignoreTypeIndexes: true },
  ],
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/explicit-member-accessibility': ['error', { overrides: { constructors: 'no-public' } }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-empty-function': ['error', { allow: ['methods'] }],
  '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
    plugins: { local: noLineComments },
    rules: {
      'local/no-line-comments': 'error',
      complexity: ['error', 8],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylistic],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { local: noLineComments },
    rules: sourceRules,
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-classes-per-file': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
