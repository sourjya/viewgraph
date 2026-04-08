/**
 * Salience Scorer - Unit Tests
 *
 * Tests the scoring algorithm and tier classification. Uses plain
 * element record objects (no DOM needed).
 */

import { describe, it, expect } from 'vitest';
import { scoreElement, classifyTier, scoreAll } from '../../lib/salience.js';

/** Helper: minimal element record with overrides. */
function el(overrides = {}) {
  return {
    nid: 1, tag: 'div', bbox: [0, 0, 200, 100],
    isInteractive: false, isSemantic: false,
    testid: null, ariaLabel: null, role: null,
    visibleText: '', styles: {},
    ...overrides,
  };
}

const viewport = { width: 1280, height: 800 };

describe('scoreElement', () => {
  it('interactive elements get +30', () => {
    const score = scoreElement(el({ isInteractive: true }), viewport);
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('elements with testid get +20', () => {
    const score = scoreElement(el({ testid: 'submit-btn' }), viewport);
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it('elements with aria-label get +15', () => {
    const score = scoreElement(el({ ariaLabel: 'Close' }), viewport);
    expect(score).toBeGreaterThanOrEqual(15);
  });

  it('semantic tags get +10', () => {
    const score = scoreElement(el({ isSemantic: true }), viewport);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it('visible text adds +10', () => {
    const score = scoreElement(el({ visibleText: 'Hello' }), viewport);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it('in-viewport elements get +10', () => {
    const inView = scoreElement(el({ bbox: [100, 100, 200, 100] }), viewport);
    const outView = scoreElement(el({ bbox: [2000, 2000, 200, 100] }), viewport);
    expect(inView).toBeGreaterThan(outView);
  });

  it('large elements get +5', () => {
    const large = scoreElement(el({ bbox: [0, 0, 200, 100] }), viewport);
    const small = scoreElement(el({ bbox: [0, 0, 10, 10] }), viewport);
    expect(large).toBeGreaterThan(small);
  });

  it('empty wrapper div scores low', () => {
    const score = scoreElement(el({ bbox: [2000, 2000, 10, 10] }), viewport);
    expect(score).toBeLessThan(20);
  });
});

describe('classifyTier', () => {
  it('score >= 50 is high', () => expect(classifyTier(50)).toBe('high'));
  it('score >= 20 is med', () => expect(classifyTier(20)).toBe('med'));
  it('score < 20 is low', () => expect(classifyTier(10)).toBe('low'));
  it('score 49 is med', () => expect(classifyTier(49)).toBe('med'));
});

describe('scoreAll', () => {
  it('adds score and salience to each element', () => {
    const elements = [
      el({ isInteractive: true, testid: 'btn', visibleText: 'Click' }),
      el({ bbox: [2000, 2000, 5, 5] }),
    ];
    const scored = scoreAll(elements, viewport);
    expect(scored[0].salience).toBe('high');
    expect(scored[1].salience).toBe('low');
    expect(scored).toHaveLength(2);
  });
});
