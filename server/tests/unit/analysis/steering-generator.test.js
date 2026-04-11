/**
 * Steering Generator - Unit Tests
 *
 * @see src/analysis/steering-generator.js
 */

import { describe, it, expect } from 'vitest';
import { analyzePatterns } from '#src/analysis/steering-generator.js';

describe('analyzePatterns', () => {
  it('(+) detects dominant category pattern', () => {
    const annotations = [
      { category: 'accessibility', severity: 'major', selector: 'button.x', resolution: { action: 'fixed' } },
      { category: 'accessibility', severity: 'major', selector: 'img.y', resolution: { action: 'fixed' } },
      { category: 'accessibility', severity: 'minor', selector: 'input.z', resolution: { action: 'fixed' } },
      { category: 'visual', severity: 'minor', selector: 'div.a', resolution: { action: 'fixed' } },
    ];
    const result = analyzePatterns(annotations);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.patterns[0].category).toBe('accessibility');
    expect(result.patterns[0].percentage).toBe(75);
    expect(result.patterns[0].recommendation).toContain('eslint-plugin-jsx-a11y');
  });

  it('(+) detects element type pattern', () => {
    const annotations = [
      { category: 'visual', selector: 'button.a', resolution: { action: 'fixed' } },
      { category: 'visual', selector: 'button.b', resolution: { action: 'fixed' } },
      { category: 'visual', selector: 'button.c', resolution: { action: 'fixed' } },
      { category: 'visual', selector: 'div.d', resolution: { action: 'fixed' } },
    ];
    const result = analyzePatterns(annotations);
    const btnPattern = result.patterns.find((p) => p.category === 'element:button');
    expect(btnPattern).toBeTruthy();
    expect(btnPattern.percentage).toBe(75);
  });

  it('(-) needs 3+ resolved annotations', () => {
    const result = analyzePatterns([
      { category: 'visual', resolution: { action: 'fixed' } },
      { category: 'visual', resolution: { action: 'fixed' } },
    ]);
    expect(result.patterns.length).toBe(0);
    expect(result.summary).toContain('Not enough');
  });

  it('(-) ignores unresolved annotations', () => {
    const annotations = [
      { category: 'accessibility', severity: 'major', selector: 'button.x' },
      { category: 'accessibility', severity: 'major', selector: 'img.y' },
      { category: 'accessibility', severity: 'minor', selector: 'input.z' },
    ];
    const result = analyzePatterns(annotations);
    expect(result.summary).toContain('Not enough');
  });

  it('(+) detects critical severity pattern', () => {
    const annotations = [
      { severity: 'critical', category: 'layout', selector: 'div.a', resolution: { action: 'fixed' } },
      { severity: 'critical', category: 'layout', selector: 'div.b', resolution: { action: 'fixed' } },
      { severity: 'minor', category: 'visual', selector: 'p.c', resolution: { action: 'fixed' } },
    ];
    const result = analyzePatterns(annotations);
    const sevPattern = result.patterns.find((p) => p.category === 'severity');
    expect(sevPattern).toBeTruthy();
    expect(sevPattern.recommendation).toContain('pre-commit');
  });
});
