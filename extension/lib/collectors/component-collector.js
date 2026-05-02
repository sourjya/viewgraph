/**
 * Component Tree Collector
 *
 * Detects the frontend framework (React, Vue, Svelte) and extracts component
 * names from DOM nodes. React components are found via internal fiber keys
 * on DOM elements. Vue components via __vue__ instances. Svelte via __svelte_meta.
 *
 * Returns a map of CSS selectors to component names, plus framework metadata.
 * This lets the agent jump from "div.sc-bdfBwQ" to "ProductCard" instantly.
 *
 * Design: framework detection runs once per capture. Component extraction walks
 * the DOM and reads internal framework properties. These properties are not part
 * of any public API and may change between framework versions - the collector
 * handles missing/changed properties gracefully by returning null.
 *
 * @see docs/architecture/strategic-recommendations.md - R1
 * @see docs/roadmap/roadmap.md - M12.3
 */

import { buildSelector } from '../selector.js';
import { walkDOM } from './collector-utils.js';

/**
 * Detect which frontend framework is active on the page.
 * @returns {'react'|'vue'|'svelte'|'none'}
 */
export function detectFramework() {
  // React: devtools hook or fiber keys on DOM nodes
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || findReactRoot()) return 'react';
  // Vue: app instance on root element
  if (document.querySelector('[data-v-app]') || findVueRoot()) return 'vue';
  // Svelte: compiled components leave __svelte_meta
  if (findSvelteRoot()) return 'svelte';
  // Angular: ng.getComponent debug API or ng-version attribute
  if (findAngularRoot()) return 'angular';
  return 'none';
}

/** Find a React fiber root by checking common root elements. */
function findReactRoot() {
  const root = document.getElementById('root') || document.getElementById('__next') || document.getElementById('app');
  return root && getReactFiber(root);
}

/** Find a Vue root by checking for __vue_app__ on elements. */
function findVueRoot() {
  const root = document.getElementById('app') || document.getElementById('__nuxt');
  return root && root.__vue_app__;
}

/** Find a Svelte root by checking for __svelte_meta. */
function findSvelteRoot() {
  const all = document.querySelectorAll('[class]');
  for (const el of all) {
    if (el.__svelte_meta) return true;
  }
  return false;
}

/**
 * Get the React fiber from a DOM element.
 * React stores fibers with keys like __reactFiber$xxx or __reactInternalInstance$xxx.
 * @param {Element} el
 * @returns {object|null}
 */
function getReactFiber(el) {
  const key = Object.keys(el).find((k) =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  );
  return key ? el[key] : null;
}

/**
 * Extract React component name from a fiber.
 * Walks up the fiber tree to find the nearest function/class component.
 * Also extracts _debugSource (file + line) when available in dev builds.
 * @param {object} fiber
 * @returns {{ name: string|null, source: string|null }}
 */
function getReactComponentName(fiber) {
  let current = fiber;
  while (current) {
    if (current.type && typeof current.type === 'function') {
      const name = current.type.displayName || current.type.name || null;
      const source = extractDebugSource(current);
      return { name, source };
    }
    if (current.type?.$$typeof) {
      const inner = current.type.render || current.type.type;
      if (inner && typeof inner === 'function') {
        const name = inner.displayName || inner.name || null;
        const source = extractDebugSource(current);
        return { name, source };
      }
    }
    current = current.return;
  }
  return { name: null, source: null };
}

/**
 * Extract source file path from a React fiber's _debugSource.
 * Only available in development builds (React sets this from JSX transform).
 * Returns "filename:line" or null.
 * @param {object} fiber
 * @returns {string|null}
 */
function extractDebugSource(fiber) {
  const ds = fiber._debugSource;
  if (!ds) return null;
  const file = ds.fileName || ds.file || null;
  if (!file) return null;
  const line = ds.lineNumber || ds.line || null;
  return line ? `${file}:${line}` : file;
}

/**
 * Extract Vue component name from a DOM element.
 * @param {Element} el
 * @returns {string|null}
 */
function getVueComponentName(el) {
  // Vue 3: __vueParentComponent
  const instance = el.__vueParentComponent;
  if (instance) {
    return instance.type?.name || instance.type?.__name || null;
  }
  // Vue 2: __vue__
  if (el.__vue__) {
    return el.__vue__.$options?.name || el.__vue__.$options?._componentTag || null;
  }
  return null;
}

/**
 * Extract Svelte component name from a DOM element.
 * @param {Element} el
 * @returns {string|null}
 */
function getSvelteComponentName(el) {
  const meta = el.__svelte_meta;
  if (meta?.loc?.file) {
    // Extract filename without extension as component name
    const parts = meta.loc.file.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.svelte$/, '') || null;
  }
  return null;
}

/**
 * Find an Angular root by checking for ng-version attribute or ng debug API.
 * Angular 14+ sets ng-version on the root component element.
 * Debug API (ng.getComponent) is available when Angular runs in dev mode.
 * @returns {boolean}
 */
function findAngularRoot() {
  // ng-version attribute on root component (works in both dev and prod)
  if (document.querySelector('[ng-version]')) return true;
  // ng debug API (dev mode only)
  if (typeof window.ng?.getComponent === 'function') return true;
  return false;
}

/**
 * Extract Angular component name from a DOM element.
 * Uses ng.getComponent() debug API (dev mode) to get the component instance,
 * then reads the constructor name. Falls back to the element's tag name for
 * Angular custom elements (app-*, mat-*) in production mode.
 * @param {Element} el
 * @returns {string|null}
 */
function getAngularComponentName(el) {
  // Dev mode: ng.getComponent() returns the component instance
  if (typeof window.ng?.getComponent === 'function') {
    try {
      const comp = window.ng.getComponent(el);
      if (comp) {
        return comp.constructor?.name || null;
      }
    } catch {
      // Element is not a component host - expected for plain elements
    }
  }
  // Fallback: Angular custom element tags (app-header, mat-button, etc.)
  const tag = el.tagName?.toLowerCase();
  if (tag && (tag.startsWith('app-') || tag.startsWith('mat-') || tag.includes('-')) && el.hasAttribute('_nghost')) {
    // Convert kebab-case tag to PascalCase: app-product-card -> AppProductCard
    return tag.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Component';
  }
  return null;
}

/** Build a compact selector for an element. */
/**
 * Collect component names and source paths from the live DOM.
 * @returns {{ framework: string, components: Array<{ selector: string, component: string, source: string|null }> }}
 */
export function collectComponents() {
  const framework = detectFramework();
  if (framework === 'none') return { framework: 'none', components: [] };

  const components = [];
  const seen = new Set();

  for (const node of walkDOM({ max: 3000 })) {

    let name = null;
    let source = null;
    if (framework === 'react') {
      const fiber = getReactFiber(node);
      if (fiber) {
        const result = getReactComponentName(fiber);
        name = result.name;
        source = result.source;
      }
    } else if (framework === 'vue') {
      name = getVueComponentName(node);
    } else if (framework === 'svelte') {
      name = getSvelteComponentName(node);
    } else if (framework === 'angular') {
      name = getAngularComponentName(node);
    }

    if (name && !seen.has(name + ':' + buildSelector(node))) {
      seen.add(name + ':' + buildSelector(node));
      components.push({ selector: buildSelector(node), component: name, source: source || null });
    }
  }

  return { framework, components };
}
