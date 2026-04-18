/**
 * Tooltip Component - Unit Tests
 *
 * @see extension/lib/tooltip.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTooltip } from '#lib/tooltip.js';

let shadowHost, shadowRoot, tooltip;

beforeEach(() => {
  shadowHost = document.createElement('div');
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  document.body.appendChild(shadowHost);
});

afterEach(() => {
  if (tooltip) tooltip.destroy();
  shadowHost.remove();
});

describe('createTooltip', () => {
  it('(+) creates a tooltip element in shadow root', () => {
    tooltip = createTooltip(shadowRoot);
    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip).not.toBeNull();
  });

  it('(+) tooltip starts hidden (opacity 0)', () => {
    tooltip = createTooltip(shadowRoot);
    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.style.opacity).toBe('0');
  });

  it('(+) destroy removes tooltip from shadow root', () => {
    tooltip = createTooltip(shadowRoot);
    tooltip.destroy();
    expect(shadowRoot.querySelector('[role="tooltip"]')).toBeNull();
    tooltip = null;
  });

  it('(+) attaches to elements with data-tooltip', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Test text');
    shadowRoot.appendChild(btn);
    tooltip = createTooltip(shadowRoot);

    // Trigger pointerenter
    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));

    // Wait for show delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const tip = shadowRoot.querySelector('[role="tooltip"]');
        expect(tip.textContent).toBe('Test text');
        expect(tip.style.opacity).toBe('1');
        resolve();
      }, 350);
    });
  });

  it('(+) hides on pointerleave', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Hover me');
    shadowRoot.appendChild(btn);
    tooltip = createTooltip(shadowRoot);

    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    btn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.style.opacity).toBe('0');
  });

  it('(+) removes native title attribute to prevent double tooltip', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Custom');
    btn.title = 'Native title';
    shadowRoot.appendChild(btn);
    tooltip = createTooltip(shadowRoot);

    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('(+) sets aria-describedby when shown', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Accessible');
    shadowRoot.appendChild(btn);
    tooltip = createTooltip(shadowRoot);

    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    expect(btn.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('(+) auto-attaches to dynamically added elements', async () => {
    tooltip = createTooltip(shadowRoot);

    // Add element after tooltip is created
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Dynamic');
    shadowRoot.appendChild(btn);

    // MutationObserver is async - wait a tick
    await new Promise((r) => setTimeout(r, 50));

    btn.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.textContent).toBe('Dynamic');
    expect(tip.style.opacity).toBe('1');
  });
});
