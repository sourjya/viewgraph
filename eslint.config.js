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
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
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
  // Playwright package has page.evaluate() callbacks with browser globals
  {
    files: ['packages/playwright/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  // Vitest package runs in jsdom with browser globals
  {
    files: ['packages/vitest/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  // Ignore build outputs, generated files, and experiment scripts
  // Experiment scripts contain page.evaluate() callbacks with browser globals
  // that ESLint can't understand in a Node.js context
  {
    ignores: ['**/node_modules/**', '**/.output/**', '**/dist/**', '**/logs/**', '**/.wxt/**', 'scripts/experiments/**', 'packages/playwright/bundle-prebuilt.js', 'extension/public/axe.min.js'],
  },
];
