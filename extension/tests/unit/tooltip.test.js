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
  tooltip = createTooltip(shadowRoot);
});

afterEach(() => {
  tooltip.destroy();
  shadowHost.remove();
});

describe('createTooltip', () => {
  it('(+) creates a tooltip element in shadow root', () => {
    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip).not.toBeNull();
  });

  it('(+) tooltip starts hidden (opacity 0)', () => {
    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.style.opacity).toBe('0');
  });

  it('(+) destroy removes tooltip from shadow root', () => {
    tooltip.destroy();
    expect(shadowRoot.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('(+) shows tooltip text on mouseenter of data-tooltip element', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Test tooltip text');
    shadowRoot.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    // Wait for show delay (300ms)
    await new Promise((r) => setTimeout(r, 350));

    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.textContent).toBe('Test tooltip text');
    expect(tip.style.opacity).toBe('1');
  });

  it('(+) hides tooltip on mouseleave', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Hover me');
    shadowRoot.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    btn.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.style.opacity).toBe('0');
  });

  it('(+) sets aria-describedby on anchor when shown', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tooltip', 'Accessible');
    shadowRoot.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    expect(btn.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('(-) does not show for elements without data-tooltip', async () => {
    const btn = document.createElement('button');
    btn.textContent = 'No tooltip';
    shadowRoot.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));

    const tip = shadowRoot.querySelector('[role="tooltip"]');
    expect(tip.style.opacity).toBe('0');
  });
});
