/**
 * Inspector - Unit Tests
 *
 * Tests the pure logic functions from the inspector module.
 * DOM interaction (overlay positioning, event handlers) requires a
 * real browser and is covered by E2E tests in M7.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildTooltipText } from '../../lib/inspector.js';

/**
 * Stub getBoundingClientRect for jsdom (returns zeros by default).
 */
function stubBoundingRects() {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 20, width: 200, height: 50, right: 210, bottom: 70 };
  };
  return () => { Element.prototype.getBoundingClientRect = original; };
}

describe('buildTooltipText', () => {
  let restore;

  beforeEach(() => {
    document.body.innerHTML = '';
    restore = stubBoundingRects();
  });

  it('includes tag name', () => {
    document.body.innerHTML = '<button>Click</button>';
    const btn = document.querySelector('button');
    expect(buildTooltipText(btn)).toContain('button');
    restore();
  });

  it('includes role when present', () => {
    document.body.innerHTML = '<div role="navigation">Nav</div>';
    const el = document.querySelector('div');
    expect(buildTooltipText(el)).toContain('role="navigation"');
    restore();
  });

  it('includes data-testid when present', () => {
    document.body.innerHTML = '<button data-testid="submit-btn">Go</button>';
    const el = document.querySelector('button');
    expect(buildTooltipText(el)).toContain('testid="submit-btn"');
    restore();
  });

  it('includes aria-label when present', () => {
    document.body.innerHTML = '<button aria-label="Close">X</button>';
    const el = document.querySelector('button');
    expect(buildTooltipText(el)).toContain('aria="Close"');
    restore();
  });

  it('includes element id', () => {
    document.body.innerHTML = '<div id="main">Content</div>';
    const el = document.querySelector('#main');
    expect(buildTooltipText(el)).toContain('#main');
    restore();
  });

  it('includes dimensions', () => {
    document.body.innerHTML = '<div>Content</div>';
    const el = document.querySelector('div');
    expect(buildTooltipText(el)).toContain('200x50');
    restore();
  });

  it('includes depth', () => {
    document.body.innerHTML = '<div>Content</div>';
    const el = document.querySelector('div');
    expect(buildTooltipText(el)).toMatch(/depth:\d+/);
    restore();
  });

  it('handles element with all attributes', () => {
    document.body.innerHTML = '<button id="btn" role="button" data-testid="save" aria-label="Save">Save</button>';
    const el = document.querySelector('button');
    const text = buildTooltipText(el);
    expect(text).toContain('button');
    expect(text).toContain('role="button"');
    expect(text).toContain('testid="save"');
    expect(text).toContain('aria="Save"');
    expect(text).toContain('#btn');
    restore();
  });
});
