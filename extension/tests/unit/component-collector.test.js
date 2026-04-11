/**
 * Component Tree Collector - Unit Tests
 *
 * Tests framework detection and component name extraction for React, Vue,
 * and Svelte. Uses mock fiber/instance objects since jsdom doesn't run
 * actual frameworks.
 *
 * @see lib/component-collector.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectFramework, collectComponents } from '#lib/component-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
  // Clean up any framework globals
  delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
});

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

describe('detectFramework', () => {
  it('(+) detects React via devtools hook', () => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    expect(detectFramework()).toBe('react');
  });

  it('(+) detects React via fiber on #root', () => {
    const root = document.createElement('div');
    root.id = 'root';
    root['__reactFiber$abc123'] = { type: 'div' };
    document.body.appendChild(root);
    expect(detectFramework()).toBe('react');
  });

  it('(+) detects Vue via data-v-app', () => {
    document.body.innerHTML = '<div data-v-app></div>';
    expect(detectFramework()).toBe('vue');
  });

  it('(+) detects Vue via __vue_app__', () => {
    const root = document.createElement('div');
    root.id = 'app';
    root.__vue_app__ = {};
    document.body.appendChild(root);
    expect(detectFramework()).toBe('vue');
  });

  it('(-) returns none when no framework detected', () => {
    document.body.innerHTML = '<div>Plain HTML</div>';
    expect(detectFramework()).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// React component extraction
// ---------------------------------------------------------------------------

describe('React components', () => {
  beforeEach(() => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
  });

  it('(+) extracts component name from fiber', () => {
    const el = document.createElement('div');
    el.id = 'card';
    function ProductCard() {}
    el['__reactFiber$abc'] = { type: ProductCard, return: null };
    document.body.appendChild(el);

    const { framework, components } = collectComponents();
    expect(framework).toBe('react');
    expect(components.length).toBe(1);
    expect(components[0].component).toBe('ProductCard');
  });

  it('(+) extracts displayName over name', () => {
    const el = document.createElement('div');
    function _internal() {}
    _internal.displayName = 'UserAvatar';
    el['__reactFiber$abc'] = { type: _internal, return: null };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('UserAvatar');
  });

  it('(+) walks up fiber tree to find component', () => {
    const el = document.createElement('div');
    function Header() {}
    // Fiber for a host element (type is string 'div'), parent is the component
    el['__reactFiber$abc'] = { type: 'div', return: { type: Header, return: null } };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('Header');
  });

  it('(-) skips elements without fiber', () => {
    document.body.innerHTML = '<div>No fiber</div>';
    const { components } = collectComponents();
    expect(components.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Vue component extraction
// ---------------------------------------------------------------------------

describe('Vue components', () => {
  it('(+) extracts Vue 3 component name', () => {
    document.body.innerHTML = '<div data-v-app></div>';
    const el = document.createElement('div');
    el.__vueParentComponent = { type: { name: 'AppHeader' } };
    document.body.appendChild(el);

    const { framework, components } = collectComponents();
    expect(framework).toBe('vue');
    expect(components.some((c) => c.component === 'AppHeader')).toBe(true);
  });

  it('(+) extracts Vue 2 component name', () => {
    document.body.innerHTML = '<div data-v-app></div>';
    const el = document.createElement('div');
    el.__vue__ = { $options: { name: 'SideNav' } };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components.some((c) => c.component === 'SideNav')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No framework
// ---------------------------------------------------------------------------

describe('no framework', () => {
  it('(-) returns empty components for plain HTML', () => {
    document.body.innerHTML = '<div>Plain</div>';
    const { framework, components } = collectComponents();
    expect(framework).toBe('none');
    expect(components.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('deduplication', () => {
  it('(+) deduplicates same component on same selector', () => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    function Card() {}
    const el1 = document.createElement('div');
    el1.className = 'card';
    el1['__reactFiber$a'] = { type: Card, return: null };
    const el2 = document.createElement('div');
    el2.className = 'card';
    el2['__reactFiber$b'] = { type: Card, return: null };
    document.body.append(el1, el2);

    const { components } = collectComponents();
    // Same component + same selector = deduplicated
    expect(components.filter((c) => c.component === 'Card').length).toBe(1);
  });
});
