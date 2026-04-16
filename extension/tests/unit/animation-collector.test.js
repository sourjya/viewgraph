/**
 * Animation Collector - Unit Tests
 *
 * @see lib/animation-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectAnimations } from '#lib/collectors/animation-collector.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('collectAnimations', () => {
  it('(+) returns expected shape', () => {
    const result = collectAnimations();
    expect(result).toHaveProperty('animating');
    expect(result).toHaveProperty('count');
    expect(Array.isArray(result.animating)).toBe(true);
  });

  it('(+) reports supported flag', () => {
    const result = collectAnimations();
    expect(typeof result.supported).toBe('boolean');
  });

  it('(-) handles no animations', () => {
    document.body.innerHTML = '<div>Static content</div>';
    const result = collectAnimations();
    expect(result.count).toBe(0);
  });

  it('(-) never throws', () => {
    expect(() => collectAnimations()).not.toThrow();
  });
});
