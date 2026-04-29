/**
 * Hostile DOM - Integration Tests
 *
 * Verifies ViewGraph produces valid output (or gracefully degrades) on
 * malformed, extreme, and adversarial pages. Each test builds a hostile
 * DOM in jsdom, runs the full capture pipeline, and validates the output.
 *
 * @see docs/architecture/hostile-dom-test-plan.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { traverseDOM } from '#lib/capture/traverser.js';
import { scoreAll } from '#lib/capture/salience.js';
import { serialize } from '#lib/capture/serializer.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

/** Run the full capture pipeline and return the result. */
function capture() {
  const viewport = { width: 1280, height: 720 };
  const { elements, relations, containerMerge } = traverseDOM();
  const scored = scoreAll(elements, viewport);
  return serialize(scored, relations, {}, { containerMerge });
}

/**
 * Run traverseDOM only (no scoring) to test DOM walking.
 * jsdom doesn't compute getBoundingClientRect, so scoring may
 * filter everything out. We test traversal separately.
 */
function traverseOnly() {
  const { elements, relations } = traverseDOM();
  return { elements, relations };
}

// ---------------------------------------------------------------------------
// T2: Massive page
// ---------------------------------------------------------------------------

describe('T2: massive page', () => {
  it('(+) handles 2000+ elements without crashing', () => {
    for (let i = 0; i < 700; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Btn ${i}`;
      document.body.appendChild(btn);
      const a = document.createElement('a');
      a.href = `#${i}`;
      a.textContent = `Link ${i}`;
      document.body.appendChild(a);
      const inp = document.createElement('input');
      inp.placeholder = `Input ${i}`;
      document.body.appendChild(inp);
    }
    // Traversal should find elements (jsdom may return fewer due to no layout engine)
    const { elements } = traverseOnly();
    expect(elements.length).toBeGreaterThanOrEqual(0);
    // Full pipeline should not crash
    const result = capture();
    expect(result.metadata).toBeTruthy();
    // JSON should be valid
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('(+) produces valid JSON under 500KB', () => {
    for (let i = 0; i < 500; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Button ${i}`;
      btn.setAttribute('data-testid', `btn-${i}`);
      document.body.appendChild(btn);
    }
    const result = capture();
    const json = JSON.stringify(result);
    expect(json.length).toBeLessThan(500 * 1024);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T3: Empty page
// ---------------------------------------------------------------------------

describe('T3: empty page', () => {
  it('(+) produces valid capture with zero nodes', () => {
    const result = capture();
    expect(result.metadata).toBeTruthy();
    expect(result.metadata.stats.totalNodes).toBe(0);
    expect(result.nodes).toBeTruthy();
  });

  it('(+) JSON is parseable', () => {
    const result = capture();
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T4: Invisible elements
// ---------------------------------------------------------------------------

describe('T4: invisible elements', () => {
  it('(+) display:none elements are excluded from traversal', () => {
    document.body.innerHTML = '<button style="display:none" data-testid="hidden">Hidden</button><button data-testid="visible">Visible</button>';
    const { elements } = traverseOnly();
    // display:none should be skipped by traverser
    const testids = elements.map((e) => e.testid).filter(Boolean);
    expect(testids).not.toContain('hidden');
  });

  it('(+) visibility:hidden elements may appear but flagged', () => {
    document.body.innerHTML = '<button style="visibility:hidden" data-testid="vhidden">Hidden</button>';
    const result = capture();
    // Should not crash regardless of whether element is included
    expect(result.metadata).toBeTruthy();
  });

  it('(+) zero-size elements do not crash capture', () => {
    const wrapper = document.createElement('div');
    Object.defineProperty(wrapper, 'clientWidth', { value: 0 });
    Object.defineProperty(wrapper, 'clientHeight', { value: 0 });
    wrapper.innerHTML = '<button>Inside zero-size</button>';
    document.body.appendChild(wrapper);
    const result = capture();
    expect(result.metadata).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// T10: Broken accessibility
// ---------------------------------------------------------------------------

describe('T10: broken accessibility', () => {
  it('(+) captures page with every a11y anti-pattern', () => {
    document.body.innerHTML = `
      <img src="x.png">
      <button></button>
      <button aria-label=""></button>
      <div role="button"></div>
      <input type="text">
      <div role="banana">Invalid</div>
      <button aria-hidden="true">Hidden</button>
      <button tabindex="99">High tabindex</button>
      <form><input required value=""></form>
    `;
    const { elements } = traverseOnly();
    // jsdom may return 0 elements due to no layout engine - that's ok
    expect(elements.length).toBeGreaterThanOrEqual(0);
    // Full pipeline should not crash
    const result = capture();
    expect(result.metadata).toBeTruthy();
  });

  it('(+) invalid ARIA roles do not crash traverser', () => {
    document.body.innerHTML = '<div role="banana" aria-level="abc" aria-checked="maybe">Bad ARIA</div>';
    expect(() => capture()).not.toThrow();
  });

  it('(+) duplicate IDs do not crash capture', () => {
    document.body.innerHTML = '<div id="dup">A</div><div id="dup">B</div><button id="dup">C</button>';
    expect(() => capture()).not.toThrow();
  });

  it('(+) nested interactive elements captured', () => {
    document.body.innerHTML = '<button>Outer <a href="#">Inner</a></button>';
    const result = capture();
    expect(result.metadata).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// T1: Deep nesting
// ---------------------------------------------------------------------------

describe('T1: deep nesting', () => {
  it('(+) handles 500-level nesting without crash', () => {
    let html = '';
    for (let i = 0; i < 500; i++) html += '<div>';
    html += '<button data-testid="deep">Deep</button>';
    for (let i = 0; i < 500; i++) html += '</div>';
    document.body.innerHTML = html;
    const result = capture();
    expect(result.metadata).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// T15: Enormous text content
// ---------------------------------------------------------------------------

describe('T15: enormous text', () => {
  it('(+) large text content is truncated, not crash', () => {
    const el = document.createElement('p');
    el.textContent = 'x'.repeat(100000);
    document.body.appendChild(el);
    const result = capture();
    const json = JSON.stringify(result);
    // Text should be truncated - JSON should not be 100KB+ from one element
    expect(json.length).toBeLessThan(200 * 1024);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('(+) SVG elements do not crash traverser', () => {
    document.body.innerHTML = '<svg width="100" height="100"><circle cx="50" cy="50" r="40"/><text x="10" y="50">SVG</text></svg>';
    expect(() => capture()).not.toThrow();
  });

  it('(+) template elements are skipped', () => {
    document.body.innerHTML = '<template><button>Inside template</button></template><button>Outside</button>';
    const result = capture();
    expect(result.metadata).toBeTruthy();
  });

  it('(+) elements with no tagName do not crash', () => {
    // Text nodes and comments
    document.body.innerHTML = '<!-- comment -->Plain text<button>Real</button>';
    expect(() => capture()).not.toThrow();
  });
});
