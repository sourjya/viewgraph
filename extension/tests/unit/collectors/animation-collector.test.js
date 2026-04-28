/**
 * Tests for animation-collector.js
 * @see extension/lib/collectors/animation-collector.js
 */

import { describe, it, expect, afterEach } from 'vitest';
import { collectAnimations } from '#lib/collectors/animation-collector.js';

describe('animation-collector', () => {
  const origGetAnimations = document.getAnimations;

  afterEach(() => {
    document.getAnimations = origGetAnimations;
  });

  it('(+) returns supported:false when getAnimations not available', () => {
    document.getAnimations = undefined;
    const result = collectAnimations();
    expect(result.supported).toBe(false);
    expect(result.count).toBe(0);
  });

  it('(+) returns empty when no animations', () => {
    document.getAnimations = () => [];
    const result = collectAnimations();
    expect(result.supported).toBe(true);
    expect(result.count).toBe(0);
    expect(result.animating).toEqual([]);
  });

  it('(+) collects running animations', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    document.getAnimations = () => [{
      effect: { target: el, getComputedTiming: () => ({ progress: 0.5, duration: 1000 }) },
      animationName: 'spin',
      playState: 'running',
    }];
    const result = collectAnimations();
    expect(result.count).toBe(1);
    expect(result.running).toBe(1);
    expect(result.animating[0].animations[0].name).toBe('spin');
    expect(result.animating[0].animations[0].progress).toBe(0.5);
    el.remove();
  });

  it('(+) counts paused and pending separately', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    document.getAnimations = () => [
      { effect: { target: el, getComputedTiming: () => ({}) }, animationName: 'a', playState: 'paused' },
      { effect: { target: el, getComputedTiming: () => ({}) }, animationName: 'b', playState: 'idle', pending: true },
    ];
    const result = collectAnimations();
    expect(result.paused).toBe(1);
    expect(result.pending).toBe(1);
    el.remove();
  });

  it('(-) skips elements with ATTR (ViewGraph UI)', () => {
    const host = document.createElement('div');
    host.setAttribute('data-vg-annotate', 'shadow-host');
    const el = document.createElement('div');
    host.appendChild(el);
    document.body.appendChild(host);
    document.getAnimations = () => [{
      effect: { target: el, getComputedTiming: () => ({}) },
      animationName: 'pulse',
      playState: 'running',
    }];
    const result = collectAnimations();
    expect(result.count).toBe(0);
    host.remove();
  });

  it('(-) handles null effect target', () => {
    document.getAnimations = () => [{ effect: { target: null }, playState: 'running' }];
    const result = collectAnimations();
    expect(result.count).toBe(0);
  });
});
