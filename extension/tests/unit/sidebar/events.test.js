/**
 * Sidebar Event Bus - Unit Tests
 *
 * Tests the event system that all sidebar modules use for communication.
 *
 * @see lib/sidebar/events.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EVENTS, createEventBus } from '#lib/sidebar/events.js';

describe('EVENTS catalog', () => {
  it('(+) is frozen (immutable)', () => {
    expect(Object.isFrozen(EVENTS)).toBe(true);
  });

  it('(+) all values are vg: prefixed strings', () => {
    for (const [key, value] of Object.entries(EVENTS)) {
      expect(typeof value).toBe('string');
      expect(value.startsWith('vg:')).toBe(true);
    }
  });

  it('(+) no duplicate event names', () => {
    const values = Object.values(EVENTS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('(+) has all required events', () => {
    expect(EVENTS.REFRESH).toBeDefined();
    expect(EVENTS.TAB_SWITCH).toBeDefined();
    expect(EVENTS.ANNOTATION_ADDED).toBeDefined();
    expect(EVENTS.ANNOTATION_REMOVED).toBeDefined();
    expect(EVENTS.ANNOTATION_RESOLVED).toBeDefined();
    expect(EVENTS.ANNOTATION_SELECTED).toBeDefined();
    expect(EVENTS.CONFIG_CHANGED).toBeDefined();
    expect(EVENTS.HELP_TOGGLE).toBeDefined();
    expect(EVENTS.SETTINGS_TOGGLE).toBeDefined();
    expect(EVENTS.CAPTURE_RECEIVED).toBeDefined();
    expect(EVENTS.AUDIT_RESULTS).toBeDefined();
    expect(EVENTS.COLLAPSE_TOGGLE).toBeDefined();
    expect(EVENTS.DESTROY).toBeDefined();
  });
});

describe('createEventBus', () => {
  let root;
  let bus;

  beforeEach(() => {
    root = document.createElement('div');
    bus = createEventBus(root);
  });

  // ── emit + on ──────────────────────────────────────────────

  it('(+) on receives emitted event detail', () => {
    const handler = vi.fn();
    bus.on(EVENTS.REFRESH, handler);
    bus.emit(EVENTS.REFRESH, { source: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ source: 'test' }, expect.any(Event));
  });

  it('(+) emit with no detail passes empty object', () => {
    const handler = vi.fn();
    bus.on(EVENTS.REFRESH, handler);
    bus.emit(EVENTS.REFRESH);
    expect(handler).toHaveBeenCalledWith({}, expect.any(Event));
  });

  it('(+) multiple listeners on same event all fire', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(EVENTS.REFRESH, h1);
    bus.on(EVENTS.REFRESH, h2);
    bus.emit(EVENTS.REFRESH);
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('(+) different events are independent', () => {
    const refreshHandler = vi.fn();
    const destroyHandler = vi.fn();
    bus.on(EVENTS.REFRESH, refreshHandler);
    bus.on(EVENTS.DESTROY, destroyHandler);
    bus.emit(EVENTS.REFRESH);
    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(destroyHandler).not.toHaveBeenCalled();
  });

  it('(+) emit is synchronous', () => {
    const order = [];
    bus.on(EVENTS.REFRESH, () => order.push('handler'));
    order.push('before');
    bus.emit(EVENTS.REFRESH);
    order.push('after');
    expect(order).toEqual(['before', 'handler', 'after']);
  });

  // ── cleanup ──────────────────────────────────────────────

  it('(+) on returns cleanup function that removes listener', () => {
    const handler = vi.fn();
    const off = bus.on(EVENTS.REFRESH, handler);
    off();
    bus.emit(EVENTS.REFRESH);
    expect(handler).not.toHaveBeenCalled();
  });

  it('(+) cleanup is idempotent (safe to call twice)', () => {
    const handler = vi.fn();
    const off = bus.on(EVENTS.REFRESH, handler);
    off();
    off(); // second call should not throw
    bus.emit(EVENTS.REFRESH);
    expect(handler).not.toHaveBeenCalled();
  });

  it('(+) removing one listener does not affect others', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const off1 = bus.on(EVENTS.REFRESH, h1);
    bus.on(EVENTS.REFRESH, h2);
    off1();
    bus.emit(EVENTS.REFRESH);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
  });

  // ── once ──────────────────────────────────────────────

  it('(+) once fires only on first emit', () => {
    const handler = vi.fn();
    bus.once(EVENTS.REFRESH, handler);
    bus.emit(EVENTS.REFRESH);
    bus.emit(EVENTS.REFRESH);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('(+) once cleanup cancels before it fires', () => {
    const handler = vi.fn();
    const off = bus.once(EVENTS.REFRESH, handler);
    off();
    bus.emit(EVENTS.REFRESH);
    expect(handler).not.toHaveBeenCalled();
  });

  // ── destroy ──────────────────────────────────────────────

  it('(+) destroy removes all listeners', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const h3 = vi.fn();
    bus.on(EVENTS.REFRESH, h1);
    bus.on(EVENTS.DESTROY, h2);
    bus.once(EVENTS.TAB_SWITCH, h3);
    bus.destroy();
    bus.emit(EVENTS.REFRESH);
    bus.emit(EVENTS.DESTROY);
    bus.emit(EVENTS.TAB_SWITCH);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
    expect(h3).not.toHaveBeenCalled();
  });

  it('(+) destroy is safe to call multiple times', () => {
    bus.destroy();
    expect(() => bus.destroy()).not.toThrow();
  });

  it('(+) emit after destroy does not throw', () => {
    bus.destroy();
    expect(() => bus.emit(EVENTS.REFRESH)).not.toThrow();
  });

  // ── bus is frozen ──────────────────────────────────────────────

  it('(+) bus object is frozen (immutable)', () => {
    expect(Object.isFrozen(bus)).toBe(true);
  });

  // ── event isolation ──────────────────────────────────────────────

  it('(-) events do not leak to parent DOM', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    const childBus = createEventBus(child);
    const parentHandler = vi.fn();
    parent.addEventListener('vg:refresh', parentHandler);
    childBus.emit(EVENTS.REFRESH);
    expect(parentHandler).not.toHaveBeenCalled();
    childBus.destroy();
  });

  it('(-) two bus instances on different roots are independent', () => {
    const root2 = document.createElement('div');
    const bus2 = createEventBus(root2);
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(EVENTS.REFRESH, h1);
    bus2.on(EVENTS.REFRESH, h2);
    bus.emit(EVENTS.REFRESH);
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();
    bus2.destroy();
  });
});
