/**
 * Sidebar Event Bus
 *
 * Centralized event system for inter-module communication within the
 * ViewGraph sidebar. Uses native CustomEvent on the shadow DOM root
 * as the transport - zero dependencies, browser-native, garbage-collected.
 *
 * Design principles:
 * 1. Single event bus per sidebar instance (shadow root)
 * 2. Typed event catalog - no magic strings outside this file
 * 3. Automatic cleanup via AbortController - prevents memory leaks
 * 4. Detail payload is always an object (never primitives)
 * 5. Events don't bubble (bubbles: false) - stays within shadow DOM
 * 6. Synchronous dispatch - listeners run immediately (no microtask delay)
 *
 * Usage:
 *   const bus = createEventBus(shadowRoot);
 *   const off = bus.on(EVENTS.REFRESH, (detail) => { ... });
 *   bus.emit(EVENTS.REFRESH, { source: 'sync' });
 *   off(); // cleanup single listener
 *   bus.destroy(); // cleanup all listeners
 *
 * @see docs/architecture/modularity-audit.md - Event-Driven Architecture Rule
 */

// ──────────────────────────────────────────────
// Event Catalog - Single source of truth
// ──────────────────────────────────────────────

/**
 * All event names used in the sidebar. Modules import these constants
 * instead of using string literals. Adding a new event? Add it here.
 * @readonly
 */
export const EVENTS = Object.freeze({
  /** Sidebar list needs re-rendering (annotations changed). */
  REFRESH: 'vg:refresh',

  /** Switch between Review and Inspect tabs. Detail: { tab: 'review'|'inspect' } */
  TAB_SWITCH: 'vg:tab-switch',

  /** New annotation created. Detail: { annotation } */
  ANNOTATION_ADDED: 'vg:annotation-added',

  /** Annotation deleted. Detail: { id } */
  ANNOTATION_REMOVED: 'vg:annotation-removed',

  /** Annotation resolved by agent. Detail: { uuid, resolution } */
  ANNOTATION_RESOLVED: 'vg:annotation-resolved',

  /** Annotation selected for editing. Detail: { annotation } */
  ANNOTATION_SELECTED: 'vg:annotation-selected',

  /** Project config changed. Detail: { key, value } */
  CONFIG_CHANGED: 'vg:config-changed',

  /** Toggle help card visibility. Detail: { visible?: boolean } */
  HELP_TOGGLE: 'vg:help-toggle',

  /** Toggle settings screen visibility. Detail: { visible?: boolean } */
  SETTINGS_TOGGLE: 'vg:settings-toggle',

  /** New capture received from server. Detail: { filename } */
  CAPTURE_RECEIVED: 'vg:capture-received',

  /** Auto-audit results arrived. Detail: { filename, audit } */
  AUDIT_RESULTS: 'vg:audit-results',

  /** Toggle sidebar collapse/expand. Detail: {} */
  COLLAPSE_TOGGLE: 'vg:collapse-toggle',

  /** Sidebar is being destroyed. Detail: {} */
  DESTROY: 'vg:destroy',
});

// ──────────────────────────────────────────────
// Event Bus Factory
// ──────────────────────────────────────────────

/**
 * Create an event bus bound to a DOM root (typically the shadow root).
 * Returns an object with emit, on, once, and destroy methods.
 *
 * Uses AbortController for bulk cleanup - calling destroy() removes
 * all listeners registered through this bus instance.
 *
 * @param {EventTarget} root - The DOM element to dispatch events on
 * @returns {{ emit: function, on: function, once: function, destroy: function }}
 */
export function createEventBus(root) {
  /** AbortController for bulk listener cleanup on destroy. */
  const controller = new AbortController();

  /** Track individual listener cleanups for selective removal. */
  const cleanups = new Set();

  /**
   * Emit an event with optional detail payload.
   * @param {string} name - Event name from EVENTS catalog
   * @param {Object} [detail={}] - Payload (always an object, never primitives)
   */
  function emit(name, detail = {}) {
    root.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: false,    // Stay within shadow DOM
      composed: false,   // Don't cross shadow boundary
      cancelable: false, // Events are notifications, not requests
    }));
  }

  /**
   * Listen for an event. Returns a cleanup function to remove this listener.
   * All listeners are also removed when destroy() is called.
   *
   * @param {string} name - Event name from EVENTS catalog
   * @param {function} handler - Called with the detail object (not the event)
   * @returns {function} Cleanup function to remove this specific listener
   */
  function on(name, handler) {
    const wrapped = (e) => handler(e.detail, e);
    root.addEventListener(name, wrapped, { signal: controller.signal });

    const cleanup = () => {
      root.removeEventListener(name, wrapped);
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    return cleanup;
  }

  /**
   * Listen for an event once. Auto-removes after first invocation.
   * @param {string} name - Event name from EVENTS catalog
   * @param {function} handler - Called with the detail object
   * @returns {function} Cleanup function (in case you need to cancel before it fires)
   */
  function once(name, handler) {
    const wrapped = (e) => {
      handler(e.detail, e);
      cleanup();
    };
    root.addEventListener(name, wrapped, { signal: controller.signal, once: true });

    const cleanup = () => {
      root.removeEventListener(name, wrapped);
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    return cleanup;
  }

  /**
   * Remove all listeners registered through this bus.
   * Called when the sidebar is destroyed.
   */
  function destroy() {
    controller.abort();
    cleanups.clear();
  }

  return Object.freeze({ emit, on, once, destroy });
}
