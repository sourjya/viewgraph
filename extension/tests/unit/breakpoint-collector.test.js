/**
 * Breakpoint Collector - Unit Tests
 *
 * Tests collection of active CSS media query breakpoints.
 *
 * @see extension/lib/breakpoint-collector.js
 * @see docs/roadmap/roadmap.md M12.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectBreakpoints, collectMediaQueries } from '../../lib/collectors/breakpoint-collector.js';

describe('collectBreakpoints', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockMatchMedia(width) {
    window.matchMedia = vi.fn((query) => {
      // Parse "min-width: Xpx" and "max-width: Xpx" from query
      const minMatch = query.match(/min-width:\s*(\d+)px/);
      const maxMatch = query.match(/max-width:\s*(\d+)px/);
      let matches = true;
      if (minMatch) matches = matches && width >= parseInt(minMatch[1]);
      if (maxMatch) matches = matches && width <= parseInt(maxMatch[1]);
      return { matches, media: query };
    });
  }

  it('reports active breakpoints for a wide viewport', () => {
    mockMatchMedia(1440);
    const result = collectBreakpoints();
    expect(result.viewport.width).toBe(window.innerWidth);
    expect(result.breakpoints).toBeInstanceOf(Array);
    // At 1440px mock, xl (1200) should be active for min-width
    const xl = result.breakpoints.find((b) => b.name === 'xl');
    expect(xl.minWidth).toBe(true);
  });

  it('reports inactive breakpoints for a narrow viewport', () => {
    mockMatchMedia(400);
    const result = collectBreakpoints();
    const lg = result.breakpoints.find((b) => b.name === 'lg');
    expect(lg.minWidth).toBe(false);
  });

  it('includes standard breakpoint names', () => {
    mockMatchMedia(768);
    const result = collectBreakpoints();
    const names = result.breakpoints.map((b) => b.name);
    expect(names).toContain('sm');
    expect(names).toContain('md');
    expect(names).toContain('lg');
    expect(names).toContain('xl');
  });

  it('includes summary of active range', () => {
    mockMatchMedia(992);
    const result = collectBreakpoints();
    expect(result.activeRange).toBeDefined();
    expect(typeof result.activeRange).toBe('string');
  });
});

describe('collectMediaQueries', () => {
  it('(+) returns expected shape', () => {
    const result = collectMediaQueries();
    expect(result).toHaveProperty('active');
    expect(result).toHaveProperty('inactive');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.active)).toBe(true);
  });

  it('(-) handles no stylesheets', () => {
    const result = collectMediaQueries();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('(-) never throws', () => {
    expect(() => collectMediaQueries()).not.toThrow();
  });

  it('(+) caps results at 30', () => {
    const result = collectMediaQueries();
    expect(result.active.length).toBeLessThanOrEqual(30);
    expect(result.inactive.length).toBeLessThanOrEqual(30);
  });
});