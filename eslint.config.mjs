import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const ignores = ['**/dist/**', '**/build/**', '**/coverage/**', 'src-tauri/target/**'];
const [tsBaseConfig, ...tsAdditionalConfigs] = tseslint.configs['flat/recommended-type-checked'];
const tsFilePattern = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const typedConfigs = [
  {
    ...tsBaseConfig,
    files: tsFilePattern,
    plugins: {
      ...(tsBaseConfig.plugins ?? {}),
      '@typescript-eslint': tseslint,
    },
  },
  ...tsAdditionalConfigs.map((config) => ({
    ...config,
    files: tsFilePattern,
    plugins: {
      ...(config.plugins ?? {}),
      '@typescript-eslint': tseslint,
    },
  })),
];

export default [
  {
    ignores,
  },
  js.configs.recommended,
  ...typedConfigs,
  {
    files: ['**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: eslintPluginImport,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.base.json',
            './apps/*/tsconfig.json',
            './apps/*/tsconfig.node.json',
            './packages/*/tsconfig.json',
            './e2e/tsconfig.json',
          ],
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...eslintPluginImport.configs.recommended.rules,
      ...eslintPluginImport.configs.typescript.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
