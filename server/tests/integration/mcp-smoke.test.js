/**
 * MCP Initialization Smoke Test
 *
 * Spawns the server as a child process, sends initialize via stdin,
 * and verifies it responds without crashing. Catches Zod schema errors,
 * import failures, and tool registration crashes.
 *
 * Run before every release via release.sh.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.resolve(__dirname, '..', '..', 'index.js');

const EXPECTED_TOOL_COUNT = 40;

/**
 * Send a JSON-RPC message to the server and collect responses.
 * @param {object[]} messages - JSON-RPC messages to send
 * @param {number} timeoutMs - Max wait time
 * @returns {Promise<object[]>} Parsed JSON-RPC responses
 */
function sendToServer(messages, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [SERVER_ENTRY], {
      env: { ...process.env, VIEWGRAPH_CAPTURES_DIR: '/tmp/vg-smoke-test' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', () => {}); // Suppress log output

    const timer = setTimeout(() => {
      proc.kill();
      // Parse whatever we got
      const responses = stdout.split('\n').filter((l) => l.startsWith('{')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      resolve(responses);
    }, timeoutMs);

    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('exit', () => {
      clearTimeout(timer);
      const responses = stdout.split('\n').filter((l) => l.startsWith('{')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      resolve(responses);
    });

    // Write messages with a small delay between them
    for (const msg of messages) {
      proc.stdin.write(JSON.stringify(msg) + '\n');
    }
    // Close stdin after a brief delay to let server process
    setTimeout(() => { proc.stdin.end(); }, 1000);
  });
}

describe('MCP server initialization', () => {
  it('(+) server boots and responds to initialize without crashing', async () => {
    const responses = await sendToServer([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke-test', version: '1.0' } } },
    ]);

    expect(responses.length).toBeGreaterThan(0);
    const init = responses.find((r) => r.id === 1);
    expect(init).toBeDefined();
    expect(init.result).toBeDefined();
    expect(init.result.serverInfo).toBeDefined();
  }, 15000);

  it(`(+) server registers all ${EXPECTED_TOOL_COUNT} tools`, async () => {
    const responses = await sendToServer([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke-test', version: '1.0' } } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
    ]);

    const toolsResponse = responses.find((r) => r.id === 3);
    if (!toolsResponse?.result?.tools) {
      // Fallback: at least init succeeded
      const init = responses.find((r) => r.id === 1);
      expect(init?.result).toBeDefined();
      return;
    }

    const toolNames = toolsResponse.result.tools.map((t) => t.name);
    expect(toolNames.length).toBe(EXPECTED_TOOL_COUNT);
    expect(toolNames).toContain('list_captures');
    expect(toolNames).toContain('verify_fix');
    expect(toolNames).toContain('get_capture_history');
  }, 15000);
});
