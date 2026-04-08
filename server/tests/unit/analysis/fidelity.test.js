/**
 * Fidelity Comparator - Unit Tests
 *
 * Tests the comparison between a ViewGraph JSON capture and an HTML
 * snapshot to measure capture fidelity.
 */

import { describe, it, expect } from 'vitest';
import { parseSnapshot, compareFidelity } from '#src/analysis/fidelity.js';

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body>
  <nav data-testid="sidebar">
    <a data-testid="nav-home" href="/">Home</a>
    <a data-testid="nav-about" href="/about">About</a>
  </nav>
  <main>
    <h1>Welcome</h1>
    <button data-testid="submit-btn">Submit</button>
    <input data-testid="email-input" type="email" />
    <div style="display:none" data-testid="hidden-dialog">Hidden</div>
  </main>
</body></html>`;

/** Minimal ViewGraph capture matching the HTML above (minus hidden element). */
const SAMPLE_CAPTURE = {
  metadata: { stats: { totalNodes: 6 } },
  details: {
    high: {
      a: {
        2: { locators: [{ strategy: 'testId', value: 'nav-home' }], visibleText: 'Home' },
        3: { locators: [{ strategy: 'testId', value: 'nav-about' }], visibleText: 'About' },
      },
      button: {
        5: { locators: [{ strategy: 'testId', value: 'submit-btn' }], visibleText: 'Submit' },
      },
      input: {
        6: { locators: [{ strategy: 'testId', value: 'email-input' }], visibleText: '' },
      },
    },
    med: {
      nav: {
        1: { locators: [{ strategy: 'testId', value: 'sidebar' }], visibleText: '' },
      },
      h1: {
        4: { locators: [{ strategy: 'css', value: 'h1' }], visibleText: 'Welcome' },
      },
    },
    low: {},
  },
};

describe('parseSnapshot', () => {
  it('extracts elements with tags and testids from HTML', () => {
    const result = parseSnapshot(SAMPLE_HTML);
    expect(result.totalElements).toBeGreaterThan(0);
    expect(result.testids).toContain('sidebar');
    expect(result.testids).toContain('nav-home');
    expect(result.testids).toContain('hidden-dialog');
  });

  it('counts interactive elements', () => {
    const result = parseSnapshot(SAMPLE_HTML);
    expect(result.interactiveCount).toBeGreaterThanOrEqual(3); // 2 links + 1 button + 1 input
  });
});

describe('compareFidelity', () => {
  it('returns element coverage metrics', () => {
    const snapshot = parseSnapshot(SAMPLE_HTML);
    const report = compareFidelity(SAMPLE_CAPTURE, snapshot);
    expect(report.metrics.elementCoverage).toHaveProperty('total');
    expect(report.metrics.elementCoverage).toHaveProperty('captured');
    expect(report.metrics.elementCoverage).toHaveProperty('pct');
    expect(report.metrics.elementCoverage.pct).toBeGreaterThan(0);
    expect(report.metrics.elementCoverage.pct).toBeLessThanOrEqual(1);
  });

  it('returns testid coverage metrics', () => {
    const snapshot = parseSnapshot(SAMPLE_HTML);
    const report = compareFidelity(SAMPLE_CAPTURE, snapshot);
    // Capture has 5 testids, HTML has 6 (including hidden-dialog)
    expect(report.metrics.testidCoverage.total).toBe(6);
    expect(report.metrics.testidCoverage.captured).toBe(5);
  });

  it('returns interactive coverage metrics', () => {
    const snapshot = parseSnapshot(SAMPLE_HTML);
    const report = compareFidelity(SAMPLE_CAPTURE, snapshot);
    expect(report.metrics.interactiveCoverage).toHaveProperty('pct');
  });

  it('identifies missing elements with reasons', () => {
    const snapshot = parseSnapshot(SAMPLE_HTML);
    const report = compareFidelity(SAMPLE_CAPTURE, snapshot);
    expect(report.missing.length).toBeGreaterThan(0);
    const hiddenMissing = report.missing.find((m) => m.testid === 'hidden-dialog');
    expect(hiddenMissing).toBeDefined();
  });

  it('computes weighted overall score', () => {
    const snapshot = parseSnapshot(SAMPLE_HTML);
    const report = compareFidelity(SAMPLE_CAPTURE, snapshot);
    expect(report.metrics.overallScore).toBeGreaterThan(0);
    expect(report.metrics.overallScore).toBeLessThanOrEqual(1);
  });
});
