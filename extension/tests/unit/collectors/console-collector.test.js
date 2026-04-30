/**
 * Console Collector - Unit Tests
 *
 * Tests interception of console.error and console.warn for capture enrichment.
 *
 * @see extension/lib/console-collector.js
 * @see .kiro/specs/network-console-capture/requirements.md FR-2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installConsoleInterceptor, getConsoleState, resetConsoleCollector } from '#lib/collectors/console-collector.js';

describe('console-collector', () => {
  let origError;
  let origWarn;

  beforeEach(() => {
    origError = console.error;
    origWarn = console.warn;
    resetConsoleCollector();
  });

  afterEach(() => {
    console.error = origError;
    console.warn = origWarn;
  });

  it('captures console.error messages after install', () => {
    installConsoleInterceptor();
    console.error('something broke');
    const state = getConsoleState();
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBe('something broke');
    expect(state.summary.errors).toBe(1);
  });

  it('captures console.warn messages after install', () => {
    installConsoleInterceptor();
    console.warn('deprecation notice');
    const state = getConsoleState();
    expect(state.warnings).toHaveLength(1);
    expect(state.warnings[0].message).toBe('deprecation notice');
    expect(state.summary.warnings).toBe(1);
  });

  it('preserves original console behavior', () => {
    const spy = vi.fn();
    console.error = spy;
    installConsoleInterceptor();
    console.error('test');
    expect(spy).toHaveBeenCalledWith('test');
  });

  it('captures Error objects with stack traces', () => {
    installConsoleInterceptor();
    console.error(new Error('crash'));
    const state = getConsoleState();
    expect(state.errors[0].message).toContain('crash');
    expect(state.errors[0].stack).toBeTruthy();
  });

  it('truncates messages to 500 chars', () => {
    installConsoleInterceptor();
    console.error('x'.repeat(600));
    const state = getConsoleState();
    expect(state.errors[0].message.length).toBeLessThanOrEqual(500);
  });

  it('caps at 50 entries per level', () => {
    installConsoleInterceptor();
    for (let i = 0; i < 60; i++) console.error(`err ${i}`);
    const state = getConsoleState();
    expect(state.errors).toHaveLength(50);
    expect(state.summary.errors).toBe(60);
  });

  it('returns empty state before install', () => {
    const state = getConsoleState();
    expect(state.errors).toHaveLength(0);
    expect(state.warnings).toHaveLength(0);
  });

  // ── Real-world error format coverage ──

  it('(+) captures multi-argument console.error', () => {
    installConsoleInterceptor();
    console.error('Failed to load', 'https://api.example.com/users', 404);
    const state = getConsoleState();
    expect(state.errors[0].message).toContain('Failed to load');
    expect(state.errors[0].message).toContain('404');
  });

  it('(+) captures object arguments via String coercion', () => {
    installConsoleInterceptor();
    console.error({ code: 'NETWORK_ERROR', url: '/api/data' });
    const state = getConsoleState();
    expect(state.errors[0].message).toContain('object');
  });

  it('(+) captures TypeError with stack', () => {
    installConsoleInterceptor();
    try { null.foo(); } catch (e) { console.error(e); }
    const state = getConsoleState();
    expect(state.errors[0].message).toContain('Cannot read');
    expect(state.errors[0].stack).toBeTruthy();
  });

  it('(+) captures unhandled promise rejection via event', () => {
    installConsoleInterceptor();
    const event = new Event('unhandledrejection');
    event.reason = new Error('async failure');
    window.dispatchEvent(event);
    const state = getConsoleState();
    expect(state.errors.some((e) => e.message.includes('async failure'))).toBe(true);
  });

  it('(+) captures window error event', () => {
    installConsoleInterceptor();
    const event = new ErrorEvent('error', { message: 'Script error.' });
    window.dispatchEvent(event);
    const state = getConsoleState();
    expect(state.errors.some((e) => e.message.includes('Script error'))).toBe(true);
  });

  it('(+) captures unhandled rejection with string reason', () => {
    installConsoleInterceptor();
    const event = new Event('unhandledrejection');
    event.reason = 'network timeout';
    window.dispatchEvent(event);
    const state = getConsoleState();
    expect(state.errors.some((e) => e.message.includes('network timeout'))).toBe(true);
  });

  it('(+) captures mixed error and warn sequence', () => {
    installConsoleInterceptor();
    console.error('first error');
    console.warn('a warning');
    console.error('second error');
    const state = getConsoleState();
    expect(state.errors).toHaveLength(2);
    expect(state.warnings).toHaveLength(1);
    expect(state.summary.errors).toBe(2);
    expect(state.summary.warnings).toBe(1);
  });

  it('(+) onError callback fires for each error', () => {
    const spy = vi.fn();
    installConsoleInterceptor({ onError: spy });
    console.error('one');
    console.error('two');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it('(-) null/undefined arguments do not crash', () => {
    installConsoleInterceptor();
    console.error(null, undefined, NaN);
    const state = getConsoleState();
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].message).toBeDefined();
  });
});
