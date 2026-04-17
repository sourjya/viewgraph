/**
 * Trust Gate Unit Tests
 * @see lib/sidebar/trust-gate.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showTrustGate } from '#lib/sidebar/trust-gate.js';

beforeEach(() => {
  // Mock window.location for hostname extraction
  delete globalThis.window;
  globalThis.window = { location: { href: 'https://example.com/page', hostname: 'example.com' } };
});

describe('showTrustGate', () => {
  it('(+) creates gate element with warning and two buttons', () => {
    const parent = document.createElement('div');
    const anchor = document.createElement('button');
    parent.appendChild(anchor);
    showTrustGate(parent, anchor, { onSend: vi.fn(), onTrustUpdated: vi.fn() });
    const gate = parent.querySelector('[data-vg-annotate="trust-gate"]');
    expect(gate).toBeTruthy();
    expect(gate.textContent).toContain('Untrusted');
    expect(gate.querySelectorAll('button').length).toBe(2);
  });

  it('(+) "Send anyway" calls onSend and removes gate', () => {
    const parent = document.createElement('div');
    const anchor = document.createElement('button');
    parent.appendChild(anchor);
    const onSend = vi.fn();
    showTrustGate(parent, anchor, { onSend, onTrustUpdated: vi.fn() });
    const btns = parent.querySelectorAll('[data-vg-annotate="trust-gate"] button');
    const sendAnyway = [...btns].find((b) => b.textContent.includes('Send anyway'));
    sendAnyway.click();
    expect(onSend).toHaveBeenCalledWith(true);
    expect(parent.querySelector('[data-vg-annotate="trust-gate"]')).toBeNull();
  });

  it('(+) replaces existing gate on repeated calls', () => {
    const parent = document.createElement('div');
    const anchor = document.createElement('button');
    parent.appendChild(anchor);
    showTrustGate(parent, anchor, { onSend: vi.fn(), onTrustUpdated: vi.fn() });
    showTrustGate(parent, anchor, { onSend: vi.fn(), onTrustUpdated: vi.fn() });
    expect(parent.querySelectorAll('[data-vg-annotate="trust-gate"]').length).toBe(1);
  });

  it('(+) Add to trusted button includes hostname', () => {
    const parent = document.createElement('div');
    const anchor = document.createElement('button');
    parent.appendChild(anchor);
    showTrustGate(parent, anchor, { onSend: vi.fn(), onTrustUpdated: vi.fn() });
    const btns = parent.querySelectorAll('[data-vg-annotate="trust-gate"] button');
    const addBtn = [...btns].find((b) => b.textContent.includes('Add'));
    expect(addBtn.textContent).toContain('example.com');
  });
});
