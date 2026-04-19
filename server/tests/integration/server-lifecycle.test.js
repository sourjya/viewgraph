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
import http from 'http';
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
  it('switches to HTTP-only mode when stdin closes (MCP stdio)', async () => {
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

    // Server should NOT exit - it switches to HTTP-only mode
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('HTTP-only mode')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    expect(getStderr()).toContain('HTTP-only mode');

    // Clean up - kill the server since it won't exit on its own
    child.kill('SIGTERM');
    await exitPromise;
  }, 10000);

  it('switches to HTTP-only mode when stdin closes (native messaging)', async () => {
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

    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('HTTP-only mode')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    expect(getStderr()).toContain('HTTP-only mode');

    child.kill('SIGTERM');
    await exitPromise;
  }, 10000);

  it('exits after idle timeout', async () => {
    // Set a very short idle timeout (0.05 min = 3 seconds)
    const { child, exitPromise, getStderr } = spawnServer({
      VIEWGRAPH_HTTP_PORT: '19878',
      VIEWGRAPH_IDLE_TIMEOUT_MINUTES: '0.05',
    });

    // Wait for server to start
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('MCP server running') || chunk.toString().includes('Native messaging')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    // Don't close stdin - just wait for idle timeout to fire
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server did not exit within 8s from idle timeout')), 8000),
    );

    const result = await Promise.race([exitPromise, timeout]);
    expect(result.code).toBe(0);
    expect(getStderr()).toContain('idle-timeout');
  }, 12000);

  it('resets idle timer on HTTP activity', async () => {
    // 3-second idle timeout
    const port = '19879';
    const { child, exitPromise, getStderr } = spawnServer({
      VIEWGRAPH_HTTP_PORT: port,
      VIEWGRAPH_IDLE_TIMEOUT_MINUTES: '0.05',
    });

    // Wait for server to start
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('HTTP receiver listening')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    // Send HTTP requests every 1.5s to keep the server alive past the 3s timeout
    let keepAlive = true;
    const ping = async () => {
      while (keepAlive) {
        await new Promise((resolve) => {
          const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
            res.resume();
            res.on('end', resolve);
          });
          req.on('error', resolve);
        });
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    const pingLoop = ping();

    // Wait 5s - longer than the 3s idle timeout
    await new Promise((r) => setTimeout(r, 5000));

    // Server should still be alive (HTTP activity kept resetting the timer)
    const isAlive = !child.killed && child.exitCode === null;
    expect(isAlive).toBe(true);

    // Stop pinging and let it die
    keepAlive = false;
    await pingLoop;

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server did not exit after activity stopped')), 6000),
    );

    const result = await Promise.race([exitPromise, timeout]);
    expect(result.code).toBe(0);
    expect(getStderr()).toContain('idle-timeout');
  }, 15000);

  it('does not exit when idle timeout is disabled (0)', async () => {
    const { child, exitPromise, getStderr } = spawnServer({
      VIEWGRAPH_HTTP_PORT: '19880',
      VIEWGRAPH_IDLE_TIMEOUT_MINUTES: '0',
    });

    // Wait for server to start
    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('MCP server running') || chunk.toString().includes('Native messaging')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    // Wait 4 seconds - longer than the 3s timeout used in other tests
    await new Promise((r) => setTimeout(r, 4000));

    // Server should still be alive
    const isAlive = !child.killed && child.exitCode === null;
    expect(isAlive).toBe(true);
    expect(getStderr()).not.toContain('idle-timeout');

    // Clean up
    child.kill('SIGTERM');
    await exitPromise;
  }, 10000);

  it('S8-1: logs fallback mode when idle timeout=0 and stdin closes', async () => {
    const { child, exitPromise, getStderr } = spawnServer({
      VIEWGRAPH_HTTP_PORT: '19881',
      VIEWGRAPH_IDLE_TIMEOUT_MINUTES: '0',
    });

    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('MCP server running')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    // Close stdin - should switch to HTTP-only mode even with timeout=0
    child.stdin.end();

    await new Promise((resolve) => {
      child.stderr.on('data', (chunk) => {
        if (chunk.toString().includes('HTTP-only mode')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    expect(getStderr()).toContain('HTTP-only mode');
    // Server should still be alive (fallback timer is 60 min, not immediate)
    expect(child.killed).toBe(false);

    child.kill('SIGTERM');
    await exitPromise;
  }, 10000);
});
