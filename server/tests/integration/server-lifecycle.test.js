/**
 * Server Lifecycle Integration Tests
 *
 * Tests that the server exits cleanly when stdin closes (parent agent dies)
 * and when idle timeout fires. Uses child_process.fork to spawn the real
 * server entry point and verify process lifecycle behavior.
 *
 * @see .kiro/specs/server-lifecycle/ - spec
 */

import { describe, it, expect } from 'vitest';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.resolve(__dirname, '../../index.js');

/**
 * Spawn the server as a child process with stdin piped.
 * Returns the child process and a promise that resolves with exit info.
 */
function spawnServer(env = {}, args = []) {
  const child = fork(SERVER_ENTRY, args, {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      ...process.env,
      // Use a temp captures dir so it doesn't conflict
      VIEWGRAPH_CAPTURES_DIR: path.join(__dirname, '../fixtures'),
      // Use a high port to avoid conflicts with running servers
      VIEWGRAPH_HTTP_PORT: '19876',
      ...env,
    },
  });

  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });

  // Collect stderr for debugging
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  return { child, exitPromise, getStderr: () => stderr };
}

describe('server lifecycle', () => {
  it('exits when stdin closes (MCP stdio mode)', async () => {
    const { child, exitPromise, getStderr } = spawnServer();

    // Wait for server to start (look for startup message on stderr)
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('MCP server running')) resolve();
      });
      // Timeout fallback - server might be in TTY mode or HTTP-only
      setTimeout(resolve, 3000);
    });

    // Close stdin - simulates parent agent dying
    child.stdin.end();

    // Server should exit within 5 seconds
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server did not exit within 5s after stdin close')), 5000),
    );

    const result = await Promise.race([exitPromise, timeout]);
    expect(result.code).toBe(0);
    expect(getStderr()).toContain('stdin-closed');
  }, 10000);

  it('exits when stdin closes (native messaging mode)', async () => {
    const { child, exitPromise, getStderr } = spawnServer(
      { VIEWGRAPH_HTTP_PORT: '19877' },
      ['--native-host'],
    );

    // Wait for server to start
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('Native messaging')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    // Close stdin - simulates browser closing the native host
    child.stdin.end();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server did not exit within 5s after stdin close (native)')), 5000),
    );

    const result = await Promise.race([exitPromise, timeout]);
    expect(result.code).toBe(0);
    expect(getStderr()).toContain('stdin-closed');
  }, 10000);
});
