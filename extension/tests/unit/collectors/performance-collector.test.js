/**
 * Performance Collector - Unit Tests
 *
 * @see lib/performance-collector.js
 */

import { describe, it, expect } from 'vitest';
import { collectPerformance } from '#lib/collectors/performance-collector.js';

describe('collectPerformance', () => {
  it('(+) returns object with expected shape', () => {
    const result = collectPerformance();
    expect(result).toHaveProperty('navigation');
    expect(result).toHaveProperty('resources');
    expect(result).toHaveProperty('memory');
  });

  it('(+) resources has totalCount and totalSize', () => {
    const result = collectPerformance();
    expect(result.resources).toHaveProperty('totalCount');
    expect(result.resources).toHaveProperty('totalSize');
    expect(result.resources).toHaveProperty('slowResources');
    expect(Array.isArray(result.resources.slowResources)).toBe(true);
  });

  it('(-) never throws', () => {
    expect(() => collectPerformance()).not.toThrow();
  });

  it('(+) slow resources are capped at 20', () => {
    const result = collectPerformance();
    expect(result.resources.slowResources.length).toBeLessThanOrEqual(20);
  });
});
