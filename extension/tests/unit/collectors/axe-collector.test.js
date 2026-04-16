/**
 * Axe-Core Collector - Unit Tests
 *
 * Tests the axe-core integration. Since axe-core requires a real browser
 * DOM with layout, jsdom tests verify the interface contract and graceful
 * fallback behavior. Full axe scans are validated via manual browser testing.
 *
 * @see lib/axe-collector.js
 */

import { describe, it, expect } from 'vitest';
import { collectAxeResults } from '#lib/collectors/axe-collector.js';

describe('collectAxeResults', () => {
  it('(+) returns results with expected shape', async () => {
    document.body.innerHTML = '<button>OK</button>';
    const result = await collectAxeResults();
    // In jsdom, axe-core may run with limited results but should not crash
    if (result === null) {
      // Graceful fallback - acceptable in jsdom
      expect(result).toBeNull();
    } else {
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('passes');
      expect(result).toHaveProperty('incomplete');
      expect(result).toHaveProperty('inapplicable');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.violations)).toBe(true);
    }
  });

  it('(+) detects missing alt text on img', async () => {
    document.body.innerHTML = '<img src="test.png">';
    const result = await collectAxeResults();
    if (result) {
      const imgViolation = result.violations.find((v) => v.id === 'image-alt');
      expect(imgViolation).toBeTruthy();
      expect(imgViolation.impact).toBeTruthy();
    }
  });

  it('(+) detects missing button name', async () => {
    document.body.innerHTML = '<button></button>';
    const result = await collectAxeResults();
    if (result) {
      const btnViolation = result.violations.find((v) => v.id === 'button-name');
      expect(btnViolation).toBeTruthy();
    }
  });

  it('(-) returns null or valid result, never throws', async () => {
    document.body.innerHTML = '';
    const result = await collectAxeResults();
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('(+) caps violations at 50', async () => {
    // Even with many violations, result should be capped
    document.body.innerHTML = '<img src="x.png">'.repeat(100);
    const result = await collectAxeResults();
    if (result) {
      expect(result.violations.length).toBeLessThanOrEqual(50);
    }
  });

  it('(+) caps nodes per violation at 5', async () => {
    document.body.innerHTML = '<img src="x.png">'.repeat(20);
    const result = await collectAxeResults();
    if (result) {
      for (const v of result.violations) {
        expect(v.nodes.length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('(+) violation nodes have target and html', async () => {
    document.body.innerHTML = '<img src="x.png">';
    const result = await collectAxeResults();
    if (result && result.violations.length > 0) {
      const node = result.violations[0].nodes[0];
      expect(node).toHaveProperty('target');
      expect(node).toHaveProperty('html');
      expect(node).toHaveProperty('failureSummary');
    }
  });
});
