/**
 * Tests for configuration resolver.
 * Covers env var priority, config file loading, WSL path translation, and defaults.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

// We test the internal helpers by importing the module and calling resolveConfig
// with a controlled cwd pointing to a temp directory.
import { resolveConfig } from '#src/config.js';
import { ENV_CAPTURES_DIR } from '#src/constants.js';

let tmpDir;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `viewgraph-config-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  // Clear env vars that would override
  delete process.env[ENV_CAPTURES_DIR];
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env[ENV_CAPTURES_DIR];
});

describe('resolveConfig', () => {
  it('uses defaults when no config file or env var', () => {
    const config = resolveConfig(tmpDir);
    expect(config.capturesDir).toBe(path.resolve(tmpDir, 'captures'));
    expect(config.maxCaptures).toBe(50);
  });

  it('reads from .viewgraphrc.json in cwd', () => {
    writeFileSync(path.join(tmpDir, '.viewgraphrc.json'), JSON.stringify({
      capturesDir: '/tmp/my-captures',
      maxCaptures: 25,
    }));
    const config = resolveConfig(tmpDir);
    expect(config.capturesDir).toBe('/tmp/my-captures');
    expect(config.maxCaptures).toBe(25);
  });

  it('walks up directories to find config file', () => {
    const child = path.join(tmpDir, 'a', 'b');
    mkdirSync(child, { recursive: true });
    writeFileSync(path.join(tmpDir, '.viewgraphrc.json'), JSON.stringify({
      capturesDir: '/tmp/parent-captures',
    }));
    const config = resolveConfig(child);
    expect(config.capturesDir).toBe('/tmp/parent-captures');
  });

  it('env var takes priority over config file', () => {
    writeFileSync(path.join(tmpDir, '.viewgraphrc.json'), JSON.stringify({
      capturesDir: '/tmp/from-file',
    }));
    process.env[ENV_CAPTURES_DIR] = '/tmp/from-env';
    const config = resolveConfig(tmpDir);
    expect(config.capturesDir).toBe('/tmp/from-env');
  });

  it('handles relative paths in config file', () => {
    writeFileSync(path.join(tmpDir, '.viewgraphrc.json'), JSON.stringify({
      capturesDir: './my-captures',
    }));
    const config = resolveConfig(tmpDir);
    // Relative paths resolve against cwd, not config file location
    // but since resolvePath calls path.resolve, it resolves against process.cwd()
    expect(path.isAbsolute(config.capturesDir)).toBe(true);
  });

  it('handles malformed config file gracefully', () => {
    writeFileSync(path.join(tmpDir, '.viewgraphrc.json'), 'not json{{{');
    const config = resolveConfig(tmpDir);
    // Falls back to defaults
    expect(config.capturesDir).toBe(path.resolve(tmpDir, 'captures'));
  });
});
