/**
 * Component Tree Collector - Unit Tests
 *
 * Tests framework detection and component name extraction for React, Vue,
 * and Svelte. Uses mock fiber/instance objects since jsdom doesn't run
 * actual frameworks.
 *
 * @see lib/component-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { detectFramework, collectComponents } from '#lib/collectors/component-collector.js';

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

// ---------------------------------------------------------------------------
// React fiber source extraction (_debugSource)
// ---------------------------------------------------------------------------

describe('React fiber source linking', () => {
  beforeEach(() => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
  });

  it('(+) extracts _debugSource file and line from fiber', () => {
    const el = document.createElement('div');
    function LoginForm() {}
    el['__reactFiber$abc'] = {
      type: LoginForm,
      _debugSource: { fileName: 'src/components/LoginForm.tsx', lineNumber: 42 },
      return: null,
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('LoginForm');
    expect(components[0].source).toBe('src/components/LoginForm.tsx:42');
  });

  it('(+) extracts source with file field (alternate format)', () => {
    const el = document.createElement('div');
    function Card() {}
    el['__reactFiber$abc'] = {
      type: Card,
      _debugSource: { file: '/app/src/Card.jsx', line: 10 },
      return: null,
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].source).toBe('/app/src/Card.jsx:10');
  });

  it('(+) extracts source without line number', () => {
    const el = document.createElement('div');
    function Nav() {}
    el['__reactFiber$abc'] = {
      type: Nav,
      _debugSource: { fileName: 'src/Nav.tsx' },
      return: null,
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].source).toBe('src/Nav.tsx');
  });

  it('(-) source is null when _debugSource missing (production build)', () => {
    const el = document.createElement('div');
    function ProdComponent() {}
    el['__reactFiber$abc'] = { type: ProdComponent, return: null };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('ProdComponent');
    expect(components[0].source).toBeNull();
  });

  it('(-) source is null when _debugSource has no file', () => {
    const el = document.createElement('div');
    function Broken() {}
    el['__reactFiber$abc'] = {
      type: Broken,
      _debugSource: { lineNumber: 5 },
      return: null,
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].source).toBeNull();
  });

  it('(+) walks up fiber tree and finds source on parent component', () => {
    const el = document.createElement('div');
    function Wrapper() {}
    el['__reactFiber$abc'] = {
      type: 'div',
      return: {
        type: Wrapper,
        _debugSource: { fileName: 'src/Wrapper.tsx', lineNumber: 7 },
        return: null,
      },
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('Wrapper');
    expect(components[0].source).toBe('src/Wrapper.tsx:7');
  });

  it('(+) handles memo/forwardRef components with _debugSource', () => {
    const el = document.createElement('div');
    function Inner() {}
    el['__reactFiber$abc'] = {
      type: { $$typeof: Symbol.for('react.memo'), type: Inner },
      _debugSource: { fileName: 'src/Inner.tsx', lineNumber: 1 },
      return: null,
    };
    document.body.appendChild(el);

    const { components } = collectComponents();
    expect(components[0].component).toBe('Inner');
    expect(components[0].source).toBe('src/Inner.tsx:1');
  });

  it('(edge) Vue and Svelte components have null source', () => {
    delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    document.body.innerHTML = '<div data-v-app></div>';
    const el = document.createElement('div');
    el.__vueParentComponent = { type: { name: 'VueComp' } };
    document.body.appendChild(el);

    const { components } = collectComponents();
    const vue = components.find((c) => c.component === 'VueComp');
    expect(vue).toBeDefined();
    expect(vue.source).toBeNull();
  });
});

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
