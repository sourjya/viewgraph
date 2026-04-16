/**
 * Vitest Configuration - Extension Unit Tests
 *
 * Uses jsdom environment to simulate DOM APIs for testing traverser,
 * salience scorer, and serializer without a real browser.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.js'],
      exclude: ['lib/enrichment.js', 'lib/export-zip.js', 'lib/html-snapshot.js'],
    },
  },
});
