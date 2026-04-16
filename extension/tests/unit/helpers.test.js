/**
 * Test Helpers - Unit Tests
 *
 * @see tests/helpers.js
 */

import { describe, it, expect } from 'vitest';
import { VERSION } from '#tests/helpers.js';

describe('test helpers', () => {
  it('(+) VERSION matches semver format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('(+) VERSION is not empty', () => {
    expect(VERSION.length).toBeGreaterThan(0);
  });

  it('(-) VERSION is not a placeholder', () => {
    expect(VERSION).not.toBe('0.0.0');
  });
});
