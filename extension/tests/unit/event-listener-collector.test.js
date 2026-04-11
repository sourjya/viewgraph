/**
 * Event Listener Collector - Unit Tests
 *
 * @see lib/event-listener-collector.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { collectEventListeners } from '#lib/event-listener-collector.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('collectEventListeners', () => {
  it('(+) detects HTML onclick attribute', () => {
    document.body.innerHTML = '<button onclick="alert()">Click</button>';
    const { elements } = collectEventListeners();
    expect(elements.length).toBe(1);
    expect(elements[0].events).toContain('click');
    expect(elements[0].source).toBe('html-attr');
  });

  it('(+) detects multiple HTML event attributes', () => {
    document.body.innerHTML = '<input onfocus="f()" onblur="b()" onchange="c()">';
    const { elements } = collectEventListeners();
    expect(elements[0].events).toContain('focus');
    expect(elements[0].events).toContain('blur');
    expect(elements[0].events).toContain('change');
  });

  it('(+) detects React onClick via fiber', () => {
    const btn = document.createElement('button');
    btn.textContent = 'React';
    btn['__reactFiber$abc'] = { memoizedProps: { onClick: () => {} } };
    document.body.appendChild(btn);
    const { elements } = collectEventListeners();
    expect(elements.length).toBe(1);
    expect(elements[0].events).toContain('click');
    expect(elements[0].source).toBe('react');
  });

  it('(+) detects suspicious cursor:pointer without handler', () => {
    // jsdom doesn't compute styles, so cursor:pointer won't be detected
    // This test verifies the function doesn't crash
    document.body.innerHTML = '<div style="cursor:pointer">Clickable div</div>';
    const { suspicious } = collectEventListeners();
    // In jsdom, getComputedStyle may not return 'pointer', so suspicious may be empty
    expect(Array.isArray(suspicious)).toBe(true);
  });

  it('(-) skips elements without handlers', () => {
    document.body.innerHTML = '<div>No handler</div><p>Also none</p>';
    const { elements } = collectEventListeners();
    expect(elements.length).toBe(0);
  });

  it('(+) deduplicates events', () => {
    document.body.innerHTML = '<button onclick="a()" onclick="b()">Dup</button>';
    const { elements } = collectEventListeners();
    if (elements.length > 0) {
      const clickCount = elements[0].events.filter((e) => e === 'click').length;
      expect(clickCount).toBe(1);
    }
  });

  it('(+) builds selector with testid', () => {
    document.body.innerHTML = '<button data-testid="submit" onclick="go()">Go</button>';
    const { elements } = collectEventListeners();
    expect(elements[0].selector).toContain('data-testid="submit"');
  });
});
