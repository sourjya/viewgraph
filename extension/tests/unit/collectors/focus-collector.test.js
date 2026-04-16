/**
 * Focus Management Chain Collector - Unit Tests
 *
 * Tests tab order computation, focus trap detection, unreachable element
 * identification, and active element tracking.
 *
 * @see lib/focus-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectFocusChain } from '#lib/collectors/focus-collector.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Tab order
// ---------------------------------------------------------------------------

describe('tab order', () => {
  it('(+) collects buttons and links in DOM order', () => {
    document.body.innerHTML = '<button>Save</button><a href="/home">Home</a><button>Cancel</button>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder.length).toBe(3);
    expect(tabOrder[0].tag).toBe('button');
    expect(tabOrder[0].text).toBe('Save');
    expect(tabOrder[1].tag).toBe('a');
    expect(tabOrder[2].text).toBe('Cancel');
  });

  it('(+) positive tabIndex elements come first', () => {
    document.body.innerHTML = '<button tabindex="0">B</button><button tabindex="2">A</button>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder[0].text).toBe('A');
    expect(tabOrder[0].tabIndex).toBe(2);
    expect(tabOrder[1].text).toBe('B');
  });

  it('(+) positive tabIndex sorted ascending', () => {
    document.body.innerHTML = '<button tabindex="5">C</button><button tabindex="1">A</button><button tabindex="3">B</button>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder[0].tabIndex).toBe(1);
    expect(tabOrder[1].tabIndex).toBe(3);
    expect(tabOrder[2].tabIndex).toBe(5);
  });

  it('(-) disabled elements excluded from tab order', () => {
    document.body.innerHTML = '<button>OK</button><button disabled>Nope</button>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder.length).toBe(1);
    expect(tabOrder[0].text).toBe('OK');
  });

  it('(-) tabIndex=-1 excluded from tab order', () => {
    document.body.innerHTML = '<button>OK</button><button tabindex="-1">Skip</button>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder.length).toBe(1);
    expect(tabOrder[0].text).toBe('OK');
  });

  it('(+) inputs and selects included', () => {
    document.body.innerHTML = '<input type="text"><select><option>A</option></select><textarea></textarea>';
    const { tabOrder } = collectFocusChain();
    expect(tabOrder.length).toBe(3);
    expect(tabOrder.map((e) => e.tag)).toEqual(['input', 'select', 'textarea']);
  });
});

// ---------------------------------------------------------------------------
// Unreachable elements
// ---------------------------------------------------------------------------

describe('unreachable elements', () => {
  it('(+) elements with tabIndex=-1 listed as unreachable', () => {
    document.body.innerHTML = '<button tabindex="-1">Hidden</button><button>Visible</button>';
    const { unreachable } = collectFocusChain();
    expect(unreachable.length).toBe(1);
    expect(unreachable[0].text).toBe('Hidden');
  });

  it('(+) issue raised for unreachable elements', () => {
    document.body.innerHTML = '<button tabindex="-1">A</button><button tabindex="-1">B</button>';
    const { issues } = collectFocusChain();
    const issue = issues.find((i) => i.type === 'unreachable-elements');
    expect(issue).toBeTruthy();
    expect(issue.count).toBe(2);
  });

  it('(-) no unreachable issue when all elements are tabbable', () => {
    document.body.innerHTML = '<button>A</button><button>B</button>';
    const { unreachable, issues } = collectFocusChain();
    expect(unreachable.length).toBe(0);
    expect(issues.filter((i) => i.type === 'unreachable-elements').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Focus traps
// ---------------------------------------------------------------------------

describe('focus traps', () => {
  it('(+) detects role=dialog as focus trap', () => {
    document.body.innerHTML = '<div role="dialog"><button>Close</button></div>';
    const { traps } = collectFocusChain();
    expect(traps.length).toBe(1);
    expect(traps[0].focusableCount).toBe(1);
  });

  it('(+) detects aria-modal=true as focus trap', () => {
    document.body.innerHTML = '<div aria-modal="true"><input><button>OK</button></div>';
    const { traps } = collectFocusChain();
    expect(traps.length).toBe(1);
    expect(traps[0].focusableCount).toBe(2);
  });

  it('(+) empty focus trap raises issue', () => {
    document.body.innerHTML = '<div role="dialog"><p>No buttons here</p></div>';
    const { issues } = collectFocusChain();
    const issue = issues.find((i) => i.type === 'empty-focus-trap');
    expect(issue).toBeTruthy();
    expect(issue.message).toContain('no focusable elements');
  });

  it('(-) no trap issue when dialog has focusable elements', () => {
    document.body.innerHTML = '<div role="dialog"><button>OK</button></div>';
    const { issues } = collectFocusChain();
    expect(issues.filter((i) => i.type === 'empty-focus-trap').length).toBe(0);
  });

  it('(-) no traps when no dialog elements exist', () => {
    document.body.innerHTML = '<button>A</button>';
    const { traps } = collectFocusChain();
    expect(traps.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Active element
// ---------------------------------------------------------------------------

describe('active element', () => {
  it('(+) returns null when body is focused', () => {
    const { activeElement } = collectFocusChain();
    expect(activeElement).toBeNull();
  });

  it('(+) returns selector when an element is focused', () => {
    document.body.innerHTML = '<button id="submit">Go</button>';
    document.getElementById('submit').focus();
    const { activeElement } = collectFocusChain();
    expect(activeElement).toBe('button#submit');
  });
});
