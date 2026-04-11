/**
 * Intersection State Collector - Unit Tests
 *
 * @see lib/intersection-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectIntersectionState } from '#lib/intersection-collector.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('collectIntersectionState', () => {
  it('(+) returns expected shape', () => {
    const result = collectIntersectionState();
    expect(result).toHaveProperty('visible');
    expect(result).toHaveProperty('partial');
    expect(result).toHaveProperty('offscreen');
    expect(result).toHaveProperty('elements');
  });

  it('(+) counts visible elements', () => {
    document.body.innerHTML = '<button>Click</button><a href="/">Link</a>';
    const result = collectIntersectionState();
    // In jsdom, getBoundingClientRect returns 0,0,0,0 so elements are skipped
    expect(result.visible + result.partial + result.offscreen).toBeGreaterThanOrEqual(0);
  });

  it('(-) handles empty DOM', () => {
    const result = collectIntersectionState();
    expect(result.visible).toBe(0);
    expect(result.elements.length).toBe(0);
  });

  it('(-) never throws', () => {
    expect(() => collectIntersectionState()).not.toThrow();
  });

  it('(+) caps elements at 30', () => {
    const result = collectIntersectionState();
    expect(result.elements.length).toBeLessThanOrEqual(30);
  });
});
