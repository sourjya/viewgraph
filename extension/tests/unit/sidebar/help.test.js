/**
 * Sidebar Help Card - Unit Tests
 *
 * @see lib/sidebar/help.js
 */

import { describe, it, expect } from 'vitest';
import { createHelpCard } from '#lib/sidebar/help.js';

describe('createHelpCard', () => {
  it('(+) returns element with show/hide/toggle/isVisible/setVersion', () => {
    const h = createHelpCard();
    expect(h.element).toBeTruthy();
    expect(typeof h.show).toBe('function');
    expect(typeof h.hide).toBe('function');
    expect(typeof h.toggle).toBe('function');
    expect(typeof h.isVisible).toBe('function');
    expect(typeof h.setVersion).toBe('function');
  });

  it('(+) starts hidden', () => {
    const h = createHelpCard();
    expect(h.isVisible()).toBe(false);
    expect(h.element.style.display).toBe('none');
  });

  it('(+) show makes visible', () => {
    const h = createHelpCard();
    h.show();
    expect(h.isVisible()).toBe(true);
  });

  it('(+) hide after show', () => {
    const h = createHelpCard();
    h.show();
    h.hide();
    expect(h.isVisible()).toBe(false);
  });

  it('(+) toggle switches state', () => {
    const h = createHelpCard();
    h.toggle();
    expect(h.isVisible()).toBe(true);
    h.toggle();
    expect(h.isVisible()).toBe(false);
  });

  it('(+) contains shortcut keys', () => {
    const h = createHelpCard();
    const text = h.element.textContent;
    expect(text).toContain('Esc');
    expect(text).toContain('Enter');
    expect(text).toContain('Del');
  });

  it('(+) contains documentation links', () => {
    const h = createHelpCard();
    const links = h.element.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].href).toContain('gitbook.io');
  });

  it('(+) setVersion updates version text', () => {
    const h = createHelpCard();
    h.setVersion('Extension: v1.0.0 | Server: v1.0.0');
    const versionEl = h.element.querySelector('[data-vg-annotate="help-version"]');
    expect(versionEl.textContent).toContain('v1.0.0');
  });

  it('(+) setVersion with warn flag changes color', () => {
    const h = createHelpCard();
    h.setVersion('Mismatch', true);
    const versionEl = h.element.querySelector('[data-vg-annotate="help-version"]');
    expect(versionEl.style.color).toMatch(/f59e0b|rgb\(245, 158, 11\)/);
  });
});
