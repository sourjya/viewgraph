/**
 * Shared test helpers for annotation sidebar tests.
 *
 * Centralizes imports, shadow DOM query helpers, and beforeEach/afterEach
 * setup used across all sidebar test files.
 *
 * @see lib/annotation-sidebar.js - sidebar implementation
 * @see lib/annotate.js - annotation state
 */

import { vi } from 'vitest';
import {
  start, stop, addPageNote, getAnnotations, clearAnnotations,
  updateComment, resolveAnnotation, removeAnnotation, updateSeverity, updateCategory, ATTR,
} from '#lib/annotate.js';
import { create, destroy, refresh, expand, collapse, isCollapsed, _getShadowRoot } from '#lib/annotation-sidebar.js';
import { resetServerCache } from '#lib/constants.js';
import * as transport from '#lib/transport.js';
import { mockChrome } from '../../mocks/chrome.js';

// ──────────────────────────────────────────────
// Shadow DOM query helpers
// ──────────────────────────────────────────────

/** Find the sidebar's shadow root and query within it. */
function shadowQuery(selector) {
  const sr = _getShadowRoot();
  if (!sr) return null;
  return sr.querySelector(selector);
}

function shadowQueryAll(selector) {
  const sr = _getShadowRoot();
  if (!sr) return [];
  return [...sr.querySelectorAll(selector)];
}

/** Get the sidebar element from shadow DOM. */
function getSidebar() {
  return shadowQuery(`[${ATTR}="sidebar"]`);
}

/** Get the list element. */
function getList() {
  return shadowQuery(`[${ATTR}="list"]`);
}

/** Get the tab container. */
function getTabContainer() {
  return shadowQuery(`[${ATTR}="tab-container"]`);
}

/** Get all entry elements in the list. */
function getEntries() {
  const list = getList();
  if (!list) return [];
  return [...list.querySelectorAll(`[${ATTR}="entry"]`)];
}

// ──────────────────────────────────────────────
// Shared setup / teardown
// ──────────────────────────────────────────────

/** Standard beforeEach: reset DOM, location, chrome mock, BCR mock. */
function setupBeforeEach() {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'location', { value: { href: 'http://localhost:8040/projects', hostname: 'localhost', protocol: 'http:' }, writable: true, configurable: true });
  mockChrome({
    storage: {
      local: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn((data, cb) => { if (cb) cb(); return Promise.resolve(); }),
      },
      sync: {
        get: vi.fn((key, cb) => { if (cb) cb({}); return Promise.resolve({}); }),
        set: vi.fn((data, cb) => { if (cb) cb(); return Promise.resolve(); }),
      },
    },
    runtime: {
      // Base mockChrome handles vg-transport and vg-get-server
      getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
    },
  });
  Element.prototype._origGetBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 };
  };
}

/** Standard afterEach: destroy sidebar, stop annotate, restore BCR, clean chrome. */
function setupAfterEach() {
  destroy();
  stop();
  clearAnnotations();
  Element.prototype.getBoundingClientRect = Element.prototype._origGetBCR;
  delete Element.prototype._origGetBCR;
  delete globalThis.chrome;
}

export {
  // annotate.js re-exports
  start, stop, addPageNote, getAnnotations, clearAnnotations,
  updateComment, resolveAnnotation, removeAnnotation, updateSeverity, updateCategory, ATTR,
  // annotation-sidebar.js re-exports
  create, destroy, refresh, expand, collapse, isCollapsed, _getShadowRoot,
  // constants / transport
  resetServerCache, transport,
  // helpers
  shadowQuery, shadowQueryAll, getSidebar, getList, getTabContainer, getEntries,
  // setup/teardown
  setupBeforeEach, setupAfterEach,
};
