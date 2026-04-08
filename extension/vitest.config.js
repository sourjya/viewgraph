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
    include: ['tests/unit/**/*.test.js'],
  },
});
