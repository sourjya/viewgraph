/**
 * Footer Unit Tests
 * @see lib/sidebar/footer.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFooter } from '#lib/sidebar/footer.js';
import { mockChrome } from '../../mocks/chrome.js';

beforeEach(() => {
  mockChrome();
  globalThis.navigator = { clipboard: { writeText: vi.fn(() => Promise.resolve()) }, userAgent: 'Chrome/120' };
});

describe('createFooter', () => {
  it('(+) returns element with send, copy, download buttons', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    expect(f.element.querySelector('[data-vg-annotate="send"]')).toBeTruthy();
    expect(f.element.querySelector('[data-vg-annotate="copy-md"]')).toBeTruthy();
    expect(f.element.querySelector('[data-vg-annotate="download"]')).toBeTruthy();
  });

  it('(+) send button calls onSend', () => {
    const fn = vi.fn();
    const f = createFooter({ onSend: fn, onShowSettings: vi.fn() });
    f.sendBtn.click();
    expect(fn).toHaveBeenCalled();
  });

  it('(+) settings link calls onShowSettings', () => {
    const fn = vi.fn();
    const f = createFooter({ onSend: vi.fn(), onShowSettings: fn });
    f.element.querySelector('[data-vg-annotate="settings-link"]').click();
    expect(fn).toHaveBeenCalled();
  });

  it('(+) setOfflineMode hides send, promotes copy/download', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.setOfflineMode();
    expect(f.sendBtn.style.display).toBe('none');
    expect(f.copyBtn.style.background).toContain('99, 102, 241');
  });

  it('(+) updateDisabledState disables buttons when no notes', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.updateDisabledState(false);
    expect(f.sendBtn.disabled).toBe(true);
    expect(f.sendBtn.style.opacity).toBe('0.4');
  });

  it('(+) updateDisabledState enables buttons when notes exist', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.updateDisabledState(true);
    expect(f.sendBtn.disabled).toBe(false);
    expect(f.sendBtn.style.opacity).toBe('1');
  });

  // ADR-012: status indicators moved from header to footer
  it('(+) returns statusDot element', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    expect(f.statusDot).toBeTruthy();
    expect(f.statusDot.getAttribute('data-vg-annotate')).toBe('status-dot');
  });

  it('(+) statusDot is inside footer element', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    expect(f.element.querySelector('[data-vg-annotate="status-dot"]')).toBeTruthy();
  });

  it('(+) setTrustLevel updates shield visibility and tooltip', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.setTrustLevel({ level: 'trusted', reason: 'Localhost' });
    const shield = f.element.querySelector('[data-vg-annotate="trust-shield"]');
    expect(shield.style.display).toBe('inline-flex');
    expect(shield.getAttribute('data-tooltip')).toBe('Trusted: Localhost');
  });

  it('(+) setTrustLevel capitalizes level in tooltip', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.setTrustLevel({ level: 'untrusted', reason: 'Remote URL' });
    const shield = f.element.querySelector('[data-vg-annotate="trust-shield"]');
    expect(shield.getAttribute('data-tooltip')).toBe('Untrusted: Remote URL');
  });
});
