/**
 * Capture Quality Validator - Unit Tests
 *
 * @see lib/capture-validator.js
 */

import { describe, it, expect } from 'vitest';
import { validateCapture } from '#lib/capture-validator.js';

describe('validateCapture', () => {
  it('(+) passes a good capture', () => {
    const capture = {
      nodes: [
        { tag: 'div' }, { tag: 'button', interactive: true },
        { tag: 'input', interactive: true }, { tag: 'a' },
        { tag: 'p' }, { tag: 'h1' },
      ],
      metadata: { url: 'http://localhost' },
      network: { requests: [] },
      console: { errors: [] },
    };
    const result = validateCapture(capture);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('(-) warns on empty capture', () => {
    const result = validateCapture({ nodes: [], metadata: {} });
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toContain('0 elements');
  });

  it('(-) warns on few elements', () => {
    const result = validateCapture({ nodes: [{ tag: 'div' }, { tag: 'p' }], metadata: {} });
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toContain('2 element(s)');
  });

  it('(-) warns on no interactive elements', () => {
    const capture = {
      nodes: Array(10).fill({ tag: 'div' }),
      metadata: {},
      network: {}, console: {},
    };
    const result = validateCapture(capture);
    expect(result.warnings.some((w) => w.includes('No interactive'))).toBe(true);
  });

  it('(-) warns on missing enrichment', () => {
    const capture = { nodes: Array(10).fill({ tag: 'button', interactive: true }), metadata: {} };
    const result = validateCapture(capture);
    expect(result.warnings.some((w) => w.includes('Missing network'))).toBe(true);
  });

  it('(-) warns on oversized capture', () => {
    const bigNodes = Array(2000).fill({ tag: 'div', text: 'x'.repeat(100), styles: { color: '#000' } });
    const capture = { nodes: bigNodes, metadata: {}, network: {}, console: {} };
    const result = validateCapture(capture);
    expect(result.warnings.some((w) => w.includes('KB'))).toBe(true);
  });

  it('(-) handles null/undefined capture', () => {
    expect(() => validateCapture(null)).not.toThrow();
    expect(() => validateCapture(undefined)).not.toThrow();
  });
});
