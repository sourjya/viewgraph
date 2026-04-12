/**
 * @viewgraph/playwright Bundle Builder - Unit Tests
 *
 * Tests that the bundle builder produces valid injectable JS from
 * the extension source modules. Does NOT require Playwright or a
 * browser - just verifies the bundle string is well-formed.
 *
 * @see packages/playwright/bundle.js
 */

import { describe, it, expect } from 'vitest';
import { buildBundle } from '../bundle.js';

describe('buildBundle', () => {
  let bundle;

  it('(+) produces a non-empty string', async () => {
    bundle = await buildBundle();
    expect(typeof bundle).toBe('string');
    expect(bundle.length).toBeGreaterThan(1000);
  });

  it('(+) wraps in an IIFE', async () => {
    bundle = bundle || await buildBundle();
    expect(bundle).toContain('(function()');
    expect(bundle).toContain('"use strict"');
    expect(bundle.trimEnd().endsWith('})();')).toBe(true);
  });

  it('(+) exposes window.__vg with all required functions', async () => {
    bundle = bundle || await buildBundle();
    expect(bundle).toContain('window.__vg');
    expect(bundle).toContain('traverseDOM');
    expect(bundle).toContain('scoreAll');
    expect(bundle).toContain('serialize');
    expect(bundle).toContain('captureSnapshot');
    expect(bundle).toContain('checkRendered');
  });

  it('(-) does not contain ES module import statements', async () => {
    bundle = bundle || await buildBundle();
    // No import ... from '...' lines should survive stripping
    const importLines = bundle.split('\n').filter((l) =>
      /^\s*import\s+.*from\s+['"]/.test(l));
    expect(importLines).toEqual([]);
  });

  it('(-) does not contain export statements', async () => {
    bundle = bundle || await buildBundle();
    const exportLines = bundle.split('\n').filter((l) =>
      /^\s*export\s+(function|const|default|{)/.test(l));
    expect(exportLines).toEqual([]);
  });

  it('(+) includes all 5 source modules', async () => {
    bundle = bundle || await buildBundle();
    expect(bundle).toContain('visibility-collector.js');
    expect(bundle).toContain('traverser.js');
    expect(bundle).toContain('salience.js');
    expect(bundle).toContain('serializer.js');
    expect(bundle).toContain('html-snapshot.js');
  });

  it('(+) is cached after first call', async () => {
    const first = await buildBundle();
    const second = await buildBundle();
    // Same reference (cached)
    expect(first).toBe(second);
  });

  it('(edge) bundle is valid JavaScript syntax', async () => {
    bundle = bundle || await buildBundle();
    // This will throw if the bundle has syntax errors
    // We can't execute it (needs DOM) but we can parse it
    expect(() => new Function(bundle)).not.toThrow();
  });
});
