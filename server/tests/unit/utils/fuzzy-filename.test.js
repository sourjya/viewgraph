/**
 * Fuzzy Filename Matching - Unit Tests
 *
 * Tests "did you mean" suggestions when agents provide incorrect filenames.
 * Part of F18 Phase 4: Input Validation.
 *
 * @see server/src/utils/tool-helpers.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { suggestFilename } from '#src/utils/tool-helpers.js';

let tmpDir;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `vg-fuzzy-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  // Create some capture files
  writeFileSync(path.join(tmpDir, 'viewgraph-localhost-20260418-010000.json'), '{}');
  writeFileSync(path.join(tmpDir, 'viewgraph-localhost-20260417-230000.json'), '{}');
  writeFileSync(path.join(tmpDir, 'viewgraph-staging-20260418-080000.json'), '{}');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('suggestFilename', () => {
  it('(+) suggests closest match for typo in hostname', async () => {
    const result = await suggestFilename('viewgraph-locahost-20260418-010000.json', tmpDir);
    expect(result).toBe('viewgraph-localhost-20260418-010000.json');
  });

  it('(+) suggests closest match for typo in timestamp', async () => {
    const result = await suggestFilename('viewgraph-localhost-20260418-010001.json', tmpDir);
    expect(result).toBe('viewgraph-localhost-20260418-010000.json');
  });

  it('(+) suggests match for partial filename', async () => {
    const result = await suggestFilename('staging-20260418', tmpDir);
    expect(result).toBe('viewgraph-staging-20260418-080000.json');
  });

  it('(+) suggests match for missing .json extension', async () => {
    const result = await suggestFilename('viewgraph-localhost-20260418-010000', tmpDir);
    expect(result).toBe('viewgraph-localhost-20260418-010000.json');
  });

  it('(-) returns null when no captures exist', async () => {
    const emptyDir = path.join(os.tmpdir(), `vg-empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    const result = await suggestFilename('anything.json', emptyDir);
    expect(result).toBeNull();
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('(-) returns null when nothing is close', async () => {
    const result = await suggestFilename('completely-unrelated-file.json', tmpDir);
    expect(result).toBeNull();
  });
});

import { readAndParse } from '#src/utils/tool-helpers.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../fixtures');

describe('readAndParse with fuzzy suggestions', () => {
  it('(+) suggests correct filename on typo', async () => {
    const result = await readAndParse('valid-captrue.json', FIXTURES_DIR);
    expect(result.ok).toBe(false);
    expect(result.error.content[0].text).toContain('Did you mean');
  });

  it('(+) shows available captures when no fuzzy match', async () => {
    const result = await readAndParse('zzz-no-match-at-all.json', FIXTURES_DIR);
    expect(result.ok).toBe(false);
    expect(result.error.content[0].text).toContain('list_captures');
  });
});
