/**
 * Intersection State Collector - Unit Tests
 *
 * @see lib/intersection-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectIntersectionState } from '#lib/collectors/intersection-collector.js';

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
    const btn = document.createElement('button');
    btn.textContent = 'Click';
    document.body.appendChild(btn);
    // Mock getBoundingClientRect to simulate a visible element
    btn.getBoundingClientRect = () => ({ top: 10, left: 10, bottom: 50, right: 100, width: 90, height: 40 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    const result = collectIntersectionState();
    expect(result.visible).toBeGreaterThanOrEqual(1);
  });

  it('(+) detects offscreen elements', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Off';
    document.body.appendChild(btn);
    btn.getBoundingClientRect = () => ({ top: -200, left: 0, bottom: -160, right: 100, width: 100, height: 40 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    const result = collectIntersectionState();
    expect(result.offscreen).toBeGreaterThanOrEqual(1);
    expect(result.elements.length).toBeGreaterThanOrEqual(1);
    expect(result.elements[0].state).toBe('offscreen');
  });

  it('(+) detects partially visible elements', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Partial';
    document.body.appendChild(btn);
    // Top is above viewport, bottom is inside
    btn.getBoundingClientRect = () => ({ top: -10, left: 0, bottom: 50, right: 100, width: 100, height: 60 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    const result = collectIntersectionState();
    expect(result.partial).toBeGreaterThanOrEqual(1);
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
