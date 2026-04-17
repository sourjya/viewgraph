/**
 * Header Unit Tests
 * @see lib/sidebar/header.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHeader } from '#lib/sidebar/header.js';

beforeEach(() => {
  globalThis.chrome = { runtime: { getURL: () => 'icon-16.png', getManifest: () => ({ version: '0.3.7' }) } };
});

describe('createHeader', () => {
  it('(+) returns element with all expected children', () => {
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: vi.fn(), onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    expect(h.element.tagName).toBe('DIV');
    expect(h.statusDot).toBeTruthy();
    expect(h.trustShield).toBeTruthy();
    expect(h.bellBtn).toBeTruthy();
    expect(h.statusBanner).toBeTruthy();
  });

  it('(+) toggle button calls onToggleCollapse', () => {
    const fn = vi.fn();
    const h = createHeader({ onToggleCollapse: fn, onClose: vi.fn(), onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    h.element.querySelector('[data-vg-annotate="toggle"]').click();
    expect(fn).toHaveBeenCalled();
  });

  it('(+) close button calls onClose', () => {
    const fn = vi.fn();
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: fn, onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    h.element.querySelector('[data-vg-annotate="close"]').click();
    expect(fn).toHaveBeenCalled();
  });

  it('(+) help button calls onHelpToggle', () => {
    const fn = vi.fn();
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: vi.fn(), onHelpToggle: fn, onBellClick: vi.fn() });
    h.element.querySelector('[data-vg-annotate="help-btn"]').click();
    expect(fn).toHaveBeenCalled();
  });

  it('(+) setTrustLevel updates shield', () => {
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: vi.fn(), onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    h.setTrustLevel({ level: 'trusted', reason: 'localhost' });
    expect(h.trustShield.style.display).toBe('inline-flex');
    expect(h.trustShield.title).toContain('trusted');
  });

  it('(+) updateBell shows bell when count > 0', () => {
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: vi.fn(), onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    h.updateBell(3);
    expect(h.bellBtn.style.display).toBe('flex');
  });

  it('(+) updateBell hides bell when count is 0', () => {
    const h = createHeader({ onToggleCollapse: vi.fn(), onClose: vi.fn(), onHelpToggle: vi.fn(), onBellClick: vi.fn() });
    h.updateBell(0);
    expect(h.bellBtn.style.display).toBe('none');
  });
});
