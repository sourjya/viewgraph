/**
 * Performance Collector - Unit Tests
 *
 * @see lib/performance-collector.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import { collectPerformance } from '#lib/collectors/performance-collector.js';

describe('collectPerformance', () => {
  const origGetEntries = performance.getEntriesByType;

  afterEach(() => {
    performance.getEntriesByType = origGetEntries;
    delete performance.memory;
  });

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

  it('(+) extracts navigation timing when available', () => {
    performance.getEntriesByType = (type) => {
      if (type === 'navigation') return [{
        startTime: 0, domContentLoadedEventEnd: 100, domComplete: 200,
        loadEventEnd: 250, responseStart: 20, domInteractive: 80,
        transferSize: 5000, type: 'navigate',
      }];
      return origGetEntries.call(performance, type);
    };
    const result = collectPerformance();
    expect(result.navigation).not.toBeNull();
    expect(result.navigation.domContentLoaded).toBe(100);
    expect(result.navigation.type).toBe('navigate');
  });

  it('(+) returns null navigation when no entries', () => {
    performance.getEntriesByType = (type) => {
      if (type === 'navigation') return [];
      return origGetEntries.call(performance, type);
    };
    const result = collectPerformance();
    expect(result.navigation).toBeNull();
  });

  it('(+) reads memory info when available', () => {
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 1000, totalJSHeapSize: 2000, jsHeapSizeLimit: 4000 },
      configurable: true,
    });
    const result = collectPerformance();
    expect(result.memory).not.toBeNull();
    expect(result.memory.usedJSHeapSize).toBe(1000);
  });

  it('(+) identifies slow resources above threshold', () => {
    performance.getEntriesByType = (type) => {
      if (type === 'resource') return [
        { name: 'http://x/fast.js', initiatorType: 'script', duration: 100, transferSize: 500 },
        { name: 'http://x/slow.js', initiatorType: 'script', duration: 600, transferSize: 1000 },
      ];
      return origGetEntries.call(performance, type);
    };
    const result = collectPerformance();
    expect(result.resources.slowResources.length).toBe(1);
    expect(result.resources.slowResources[0].name).toBe('slow.js');
  });
});
