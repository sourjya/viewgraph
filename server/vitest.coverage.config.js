/**
 * Vitest Configuration - Server
 *
 * Coverage reports generated to server/coverage/.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['src/tools/**/*.js'], // tools are thin wrappers, tested via integration
    },
  },
});
