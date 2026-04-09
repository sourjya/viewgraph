/**
 * Non-injectable URL detection - Unit Tests
 *
 * Tests that restricted Chrome URLs are correctly identified as non-injectable.
 * These pages block content script injection (chrome://, about:, etc.).
 *
 * @see .kiro/specs/unified-review-panel/design.md - Non-injectable pages table
 */

import { describe, it, expect } from 'vitest';
import { isInjectable, getBlockedReason } from '../../lib/url-checks.js';

describe('isInjectable', () => {
  it('allows regular http URLs', () => {
    expect(isInjectable('http://localhost:5173')).toBe(true);
    expect(isInjectable('https://example.com/page')).toBe(true);
  });

  it('blocks chrome:// URLs', () => {
    expect(isInjectable('chrome://extensions')).toBe(false);
    expect(isInjectable('chrome://settings')).toBe(false);
  });

  it('blocks chrome-extension:// URLs', () => {
    expect(isInjectable('chrome-extension://abcdef/popup.html')).toBe(false);
  });

  it('blocks about: URLs', () => {
    expect(isInjectable('about:blank')).toBe(false);
    expect(isInjectable('about:newtab')).toBe(false);
  });

  it('blocks Chrome Web Store', () => {
    expect(isInjectable('https://chrome.google.com/webstore')).toBe(false);
    expect(isInjectable('https://chromewebstore.google.com/detail/abc')).toBe(false);
  });

  it('blocks view-source: URLs', () => {
    expect(isInjectable('view-source:https://example.com')).toBe(false);
  });

  it('blocks devtools: URLs', () => {
    expect(isInjectable('devtools://devtools/bundled/inspector.html')).toBe(false);
  });

  it('blocks data: URLs', () => {
    expect(isInjectable('data:text/html,<h1>test</h1>')).toBe(false);
  });

  it('handles undefined/empty URLs', () => {
    expect(isInjectable(undefined)).toBe(false);
    expect(isInjectable('')).toBe(false);
  });
});

describe('getBlockedReason', () => {
  it('returns specific message for chrome:// pages', () => {
    expect(getBlockedReason('chrome://extensions')).toContain('Chrome system pages');
  });

  it('returns specific message for extension pages', () => {
    expect(getBlockedReason('chrome-extension://abc')).toContain('Extension pages');
  });

  it('returns specific message for about: pages', () => {
    expect(getBlockedReason('about:blank')).toContain('Browser internal pages');
  });

  it('returns specific message for Web Store', () => {
    expect(getBlockedReason('https://chrome.google.com/webstore')).toContain('Chrome Web Store');
  });

  it('returns specific message for view-source:', () => {
    expect(getBlockedReason('view-source:https://x.com')).toContain('Source view');
  });

  it('returns specific message for devtools:', () => {
    expect(getBlockedReason('devtools://devtools/bundled/inspector.html')).toContain('DevTools');
  });

  it('returns specific message for data: URLs', () => {
    expect(getBlockedReason('data:text/html,test')).toContain('Data URLs');
  });

  it('returns generic message for unknown blocked URLs', () => {
    expect(getBlockedReason('')).toContain('Navigate to a web page');
  });
});
