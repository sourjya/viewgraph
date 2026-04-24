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

  it('(+) status row has no borderTop (footer already has one)', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    const dot = f.element.querySelector('[data-vg-annotate="status-dot"]');
    const statusRow = dot.parentElement;
    expect(statusRow.style.borderTop).toBe('');
  });

  // F21: Auth lock indicator
  it('(+) auth lock indicator exists in footer', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    expect(lock).toBeTruthy();
    expect(lock.textContent).toBe('🔓');
  });

  it('(+) auth lock starts as unsigned (dimmed)', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    expect(lock.style.opacity).toBe('0.5');
    expect(lock.getAttribute('data-tooltip')).toContain('not secured');
  });

  it('(+) setAuthMode(true) shows locked icon at full opacity', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.setAuthMode(true);
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    expect(lock.textContent).toBe('🔒');
    expect(lock.style.opacity).toBe('1');
    expect(lock.getAttribute('data-tooltip')).toBe('Connection secured');
  });

  it('(+) setAuthMode(false) shows unlocked icon dimmed', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    f.setAuthMode(true);
    f.setAuthMode(false);
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    expect(lock.textContent).toBe('🔓');
    expect(lock.style.opacity).toBe('0.5');
  });

  it('(+) footer status row order: dot, lock, shield', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    const dot = f.element.querySelector('[data-vg-annotate="status-dot"]');
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    const shield = f.element.querySelector('[data-vg-annotate="trust-shield"]');
    const row = dot.parentElement;
    const children = [...row.children];
    expect(children.indexOf(dot)).toBeLessThan(children.indexOf(lock));
    expect(children.indexOf(lock)).toBeLessThan(children.indexOf(shield));
  });

  it('(+) all footer status indicators use data-tooltip (themed, not native)', () => {
    const f = createFooter({ onSend: vi.fn(), onShowSettings: vi.fn() });
    const dot = f.element.querySelector('[data-vg-annotate="status-dot"]');
    const lock = f.element.querySelector('[data-vg-annotate="auth-lock"]');
    expect(lock.getAttribute('data-tooltip')).toBeTruthy();
    expect(lock.hasAttribute('title')).toBe(false);
    expect(dot.hasAttribute('title')).toBe(false);
  });
});
