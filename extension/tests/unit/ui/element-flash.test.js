/**
 * Element Flash - Unit Tests
 *
 * @see lib/element-flash.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flashElement } from '#lib/ui/element-flash.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('flashElement', () => {
  it('(+) creates and removes overlay', () => {
    vi.useFakeTimers();
    const el = document.createElement('button');
    el.textContent = 'Click me';
    document.body.appendChild(el);
    // Mock getBoundingClientRect
    el.getBoundingClientRect = () => ({ top: 10, left: 20, width: 100, height: 40 });
    flashElement(el);
    const overlay = document.querySelector('.vg-flash-overlay');
    expect(overlay).toBeTruthy();
    vi.advanceTimersByTime(500);
    expect(document.querySelector('.vg-flash-overlay')).toBeNull();
    vi.useRealTimers();
  });

  it('(-) handles null element', () => {
    expect(() => flashElement(null)).not.toThrow();
  });

  it('(+) injects animation style', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({ top: 0, left: 0, width: 50, height: 50 });
    flashElement(el);
    const styles = document.querySelectorAll('style');
    const hasFlash = [...styles].some((s) => s.textContent.includes('vg-flash'));
    expect(hasFlash).toBe(true);
  });
});
