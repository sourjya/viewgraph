/**
 * Package installer tests.
 *
 * Verifies that the npm package is correctly configured for MCP server
 * startup via npx. Tests the bin entries, shebang, and stdio initialization
 * that BUG-020 broke.
 *
 * @see docs/bugs/BUG-020-npx-viewgraph-core-fails-mcp.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '../../..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('package bin entries', () => {
  it('(+) has a "viewgraph" bin entry for MCP server', () => {
    expect(pkg.bin.viewgraph).toBeDefined();
    expect(pkg.bin.viewgraph).toBe('server/index.js');
  });

  it('(+) viewgraph bin is listed first (npx default)', () => {
    const keys = Object.keys(pkg.bin);
    expect(keys[0]).toBe('viewgraph');
  });

  it('(+) server/index.js has shebang line', () => {
    const content = readFileSync(resolve(ROOT, 'server/index.js'), 'utf8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('(+) all bin entries point to existing files', () => {
    for (const [name, path] of Object.entries(pkg.bin)) {
      const full = resolve(ROOT, path);
      expect(() => readFileSync(full), `${name} -> ${path} missing`).not.toThrow();
    }
  });

  it('(+) all bin scripts have shebang lines', () => {
    for (const [name, path] of Object.entries(pkg.bin)) {
      const content = readFileSync(resolve(ROOT, path), 'utf8');
      expect(content.startsWith('#!/'), `${name} missing shebang`).toBe(true);
    }
  });
});

describe('MCP server stdio initialization', () => {
  it('(+) server responds to initialize request via stdio', () => {
    const initMsg = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
    });
    const result = execSync(
      `echo '${initMsg}' | timeout -s KILL 3 node server/index.js 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf8', timeout: 10000 },
    );
    const lines = result.trim().split('\n').filter((l) => l.startsWith('{'));
    const response = JSON.parse(lines.pop());
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result.serverInfo.name).toContain('viewgraph');
  });

  it('(+) server version in response matches package.json', () => {
    const initMsg = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
    });
    const result = execSync(
      `echo '${initMsg}' | timeout -s KILL 3 node server/index.js 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf8', timeout: 10000 },
    );
    const lines = result.trim().split('\n').filter((l) => l.startsWith('{'));
    const response = JSON.parse(lines.pop());
    expect(response.result.serverInfo.version).toBe(pkg.version);
  });
});
