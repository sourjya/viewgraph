/**
 * Error Boundary State Collector - Unit Tests
 *
 * Tests detection of error boundaries via React fiber and generic
 * DOM patterns (role=alert, .error-boundary).
 *
 * @see lib/collectors/error-boundary-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectErrorBoundaries } from '#lib/collectors/error-boundary-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('collectErrorBoundaries', () => {
  it('(-) returns no boundaries and framework "none" for plain page', () => {
    document.body.innerHTML = '<div>Hello</div>';
    const { boundaries, framework } = collectErrorBoundaries();
    expect(boundaries).toHaveLength(0);
    expect(framework).toBe('none');
  });

  it('(+) detects role=alert element as generic boundary', () => {
    document.body.innerHTML = '<div role="alert">Something went wrong</div>';
    const { boundaries, framework } = collectErrorBoundaries();
    expect(boundaries.length).toBeGreaterThan(0);
    expect(boundaries[0].selector).toBe('[role="alert"]');
    expect(boundaries[0].text).toContain('Something went wrong');
    expect(framework).toBe('generic');
  });

  it('(-) returns empty boundaries for empty page', () => {
    document.body.innerHTML = '';
    const { boundaries, framework } = collectErrorBoundaries();
    expect(boundaries).toHaveLength(0);
    expect(framework).toBe('none');
  });
});
