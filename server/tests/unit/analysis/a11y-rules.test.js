/**
 * Accessibility Rules - Unit Tests
 *
 * Tests individual a11y audit rules that check nodes + details
 * for common accessibility issues.
 */

import { describe, it, expect } from 'vitest';
import { auditNode, RULES } from '#src/analysis/a11y-rules.js';

describe('a11y rules', () => {
  describe('missing-aria-label', () => {
    it('flags interactive element without aria-label or text', () => {
      const node = { id: 'btn1', tag: 'button', text: '', actions: ['click'] };
      const details = { attributes: {} };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'button-no-name')).toBe(true);
    });

    it('passes when button has text', () => {
      const node = { id: 'btn1', tag: 'button', text: 'Submit', actions: ['click'] };
      const details = { attributes: {} };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'button-no-name')).toBe(false);
    });

    it('passes when button has aria-label', () => {
      const node = { id: 'btn1', tag: 'button', text: '', actions: ['click'] };
      const details = { attributes: { 'aria-label': 'Close dialog' } };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'button-no-name')).toBe(false);
    });
  });

  describe('missing-alt', () => {
    it('flags img without alt attribute', () => {
      const node = { id: 'img1', tag: 'img', text: '', actions: [] };
      const details = { attributes: {} };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'missing-alt')).toBe(true);
    });

    it('passes when img has alt', () => {
      const node = { id: 'img1', tag: 'img', text: '', actions: [] };
      const details = { attributes: { alt: 'Logo' } };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'missing-alt')).toBe(false);
    });
  });

  describe('missing-form-label', () => {
    it('flags input without aria-label', () => {
      const node = { id: 'inp1', tag: 'input', text: '', actions: ['input'] };
      const details = { attributes: { type: 'text' } };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'missing-form-label')).toBe(true);
    });

    it('passes when input has aria-label', () => {
      const node = { id: 'inp1', tag: 'input', text: '', actions: ['input'] };
      const details = { attributes: { 'aria-label': 'Search' } };
      const issues = auditNode(node, details);
      expect(issues.some((i) => i.rule === 'missing-form-label')).toBe(false);
    });
  });

  it('returns empty array for node with no issues', () => {
    const node = { id: 'div1', tag: 'div', text: 'Hello', actions: [] };
    const details = { attributes: {} };
    const issues = auditNode(node, details);
    expect(issues).toEqual([]);
  });

  it('exports RULES array', () => {
    expect(Array.isArray(RULES)).toBe(true);
    expect(RULES.length).toBeGreaterThan(0);
  });
});
