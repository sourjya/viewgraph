/**
 * get_fidelity_report - MCP Tool Tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestClient } from './helpers.js';
import { register } from '#src/tools/get-fidelity-report.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

const SAMPLE_HTML = `<!DOCTYPE html><html><body>
  <nav data-testid="sidebar"><a data-testid="nav-home">Home</a></nav>
  <button data-testid="submit-btn">Submit</button>
</body></html>`;

const SAMPLE_CAPTURE = {
  metadata: { stats: { totalNodes: 3 } },
  details: {
    high: {
      a: { 1: { locators: [{ strategy: 'testId', value: 'nav-home' }], visibleText: 'Home' } },
      button: { 2: { locators: [{ strategy: 'testId', value: 'submit-btn' }], visibleText: 'Submit' } },
    },
    med: { nav: { 3: { locators: [{ strategy: 'testId', value: 'sidebar' }], visibleText: '' } } },
    low: {},
  },
};

describe('get_fidelity_report via MCP', () => {
  let cleanup, capturesDir;

  afterEach(async () => {
    if (cleanup) await cleanup();
    if (capturesDir) rmSync(capturesDir, { recursive: true, force: true });
  });

  it('returns fidelity report for paired capture + snapshot', async () => {
    capturesDir = path.join(os.tmpdir(), `vg-fid-${Date.now()}`);
    mkdirSync(path.join(capturesDir, 'snapshots'), { recursive: true });
    writeFileSync(path.join(capturesDir, 'viewgraph-test-123.json'), JSON.stringify(SAMPLE_CAPTURE));
    writeFileSync(path.join(capturesDir, 'snapshots', 'viewgraph-test-123.html'), SAMPLE_HTML);

    const { client, cleanup: c } = await createTestClient((s) => register(s, capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'get_fidelity_report', arguments: { filename: 'viewgraph-test-123.json' } });
    const data = JSON.parse(result.content[0].text);
    expect(data.metrics.testidCoverage.pct).toBe(1);
    expect(data.metrics.overallScore).toBeGreaterThan(0);
  });

  it('returns error when no snapshot exists', async () => {
    capturesDir = path.join(os.tmpdir(), `vg-fid-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });
    writeFileSync(path.join(capturesDir, 'viewgraph-test-456.json'), JSON.stringify(SAMPLE_CAPTURE));

    const { client, cleanup: c } = await createTestClient((s) => register(s, capturesDir));
    cleanup = c;
    const result = await client.callTool({ name: 'get_fidelity_report', arguments: { filename: 'viewgraph-test-456.json' } });
    expect(result.isError).toBe(true);
  });
});
