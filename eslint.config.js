/**
 * ESLint Configuration  -  ViewGraph
 *
 * Flat config format (ESLint 9+). Applies recommended rules across both
 * server/ and extension/ workspaces. ES modules throughout.
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  // Extension entrypoints run in browser context
  {
    files: ['extension/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
  },
  // Ignore build outputs and generated files
  {
    ignores: ['**/node_modules/**', '**/.output/**', '**/dist/**', '**/logs/**', '**/.wxt/**'],
  },
];
