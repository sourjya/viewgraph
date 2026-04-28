#!/usr/bin/env node
import { WS_MESSAGES } from '#src/ws-message-types.js';
/**
 * ViewGraph MCP Server  -  Entry Point
 *
 * Starts the MCP server over stdio transport, exposing tools for querying,
 * analyzing, and comparing DOM captures. Kiro (or any MCP host) spawns
 * this process and communicates via JSON-RPC over stdin/stdout.
 *
 * Wires together: file watcher → parser → indexer → MCP tools.
 *
 * CRITICAL: All logging goes to stderr  -  stdout is reserved for JSON-RPC.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import {
  SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION, SERVER_INSTRUCTIONS, LOG_PREFIX,
} from '#src/constants.js';
import { resolveConfig } from '#src/config.js';
import { ALLOWED_CONFIG_KEYS } from '#src/constants.js';
import { createWatcher } from '#src/watcher.js';
import { runArchive } from '#src/archive.js';
import { register as registerListArchived } from '#src/tools/list-archived.js';
import { createIndexer } from '#src/indexer.js';
import { parseMetadata } from '#src/parsers/viewgraph-v2.js';
import { register as registerListCaptures } from '#src/tools/list-captures.js';
import { register as registerGetCapture } from '#src/tools/get-capture.js';
import { register as registerGetLatest } from '#src/tools/get-latest.js';
import { register as registerGetPageSummary } from '#src/tools/get-page-summary.js';
import { register as registerGetElementsByRole } from '#src/tools/get-elements-by-role.js';
import { register as registerGetInteractive } from '#src/tools/get-interactive.js';
import { register as registerFindMissingTestids } from '#src/tools/find-missing-testids.js';
import { register as registerAuditAccessibility } from '#src/tools/audit-accessibility.js';
import { register as registerAuditLayout } from '#src/tools/audit-layout.js';
import { register as registerCompareCaptures } from '#src/tools/compare-captures.js';
import { register as registerGetAnnotations } from '#src/tools/get-annotations.js';
import { register as registerGetAnnotatedCapture } from '#src/tools/get-annotation-context.js';
import { register as registerRequestCapture } from '#src/tools/request-capture.js';
import { register as registerGetRequestStatus } from '#src/tools/get-request-status.js';
import { register as registerGetFidelityReport } from '#src/tools/get-fidelity-report.js';
import { register as registerResolveAnnotation } from '#src/tools/resolve-annotation.js';
import { register as registerGetUnresolved } from '#src/tools/get-unresolved.js';
import { register as registerCompareBaseline } from '#src/tools/compare-baseline.js';
import { register as registerSetBaseline } from '#src/tools/set-baseline.js';
import { register as registerListBaselines } from '#src/tools/list-baselines.js';
import { register as registerListSessions } from '#src/tools/list-sessions.js';
import { register as registerGetSession } from '#src/tools/get-session.js';
import { register as registerFindSource } from '#src/tools/find-source.js';
import { register as registerCheckConsistency } from '#src/tools/check-consistency.js';
import { register as registerCheckAnnotationStatus } from '#src/tools/check-annotation-status.js';
import { register as registerCompareScreenshots } from '#src/tools/compare-screenshots.js';
import { register as registerDiffAnnotations } from '#src/tools/diff-annotations.js';
import { register as registerDetectRecurring } from '#src/tools/detect-recurring-issues.js';
import { register as registerVisualizeFlow } from '#src/tools/visualize-flow.js';
import { register as registerGenerateSpec } from '#src/tools/generate-spec.js';
import { register as registerAnalyzePatterns } from '#src/tools/analyze-patterns.js';
import { register as registerAnalyzeJourney } from '#src/tools/analyze-journey.js';
import { register as registerGetCaptureStats } from '#src/tools/get-capture-stats.js';
import { register as registerValidateCapture } from '#src/tools/validate-capture.js';
import { register as registerCompareStyles } from '#src/tools/compare-styles.js';
import { register as registerGetComponentCoverage } from '#src/tools/get-component-coverage.js';
import { register as registerGetCaptureHistory } from '#src/tools/get-capture-history.js';
import { register as registerVerifyFix } from '#src/tools/verify-fix.js';
import { register as registerGetCaptureDiff } from '#src/tools/get-capture-diff.js';
import { register as registerGetSessionStatus } from '#src/tools/get-session-status.js';
import { registerPrompts } from '#src/prompts.js';
import { createRequestQueue } from '#src/request-queue.js';
import { createHttpReceiver } from '#src/http-receiver.js';
import { decodeMessage, encodeMessage } from '#src/native-host.js';
import { createMessageHandler } from '#src/native-message-handler.js';

// ---------------------------------------------------------------------------
// Configuration  -  env vars > .viewgraphrc.json > defaults
// ---------------------------------------------------------------------------

const config = resolveConfig();
const { capturesDir: CAPTURES_DIR, maxCaptures: MAX_CAPTURES, httpPort: HTTP_PORT, allowedDirs: ALLOWED_DIRS, idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES } = config;

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  description: `${SERVER_DESCRIPTION}\n\n${SERVER_INSTRUCTIONS}`,
});

const requestQueue = createRequestQueue();
const indexer = createIndexer({ maxCaptures: MAX_CAPTURES });

/** --slim mode: expose only core tools for basic browser tasks. */
const SLIM_MODE = process.argv.includes('--slim');

// Register core tools (always available)
registerListCaptures(server, indexer);
registerGetCapture(server, indexer, CAPTURES_DIR);
registerGetLatest(server, indexer, CAPTURES_DIR);
registerGetPageSummary(server, indexer, CAPTURES_DIR);
registerGetAnnotations(server, indexer, CAPTURES_DIR);
registerRequestCapture(server, requestQueue);
registerGetRequestStatus(server, requestQueue);
registerResolveAnnotation(server, indexer, CAPTURES_DIR, {
  requestQueue,
  onResolve: ({ uuid, resolution }) => {
    const ws = httpReceiver?.getWsServer?.();
    if (ws) ws.broadcast({ type: WS_MESSAGES.ANNOTATION_RESOLVED, uuid, resolution });
  },
});
registerGetUnresolved(server, indexer, CAPTURES_DIR, {
  onStatusChange: ({ uuid, status }) => {
    const ws = httpReceiver?.getWsServer?.();
    if (ws) ws.broadcast({ type: WS_MESSAGES.ANNOTATION_STATUS, uuid, status });
  },
});

if (!SLIM_MODE) {
// Register full tool set (analysis, comparison, sessions, etc.)
registerListArchived(server, CAPTURES_DIR);
registerGetElementsByRole(server, indexer, CAPTURES_DIR);
registerGetInteractive(server, indexer, CAPTURES_DIR);
registerFindMissingTestids(server, indexer, CAPTURES_DIR);
registerAuditAccessibility(server, indexer, CAPTURES_DIR);
registerAuditLayout(server, indexer, CAPTURES_DIR);
registerCompareCaptures(server, indexer, CAPTURES_DIR);
registerGetAnnotatedCapture(server, indexer, CAPTURES_DIR, {
  onStatusChange: ({ uuid, status }) => {
    const ws = httpReceiver?.getWsServer?.();
    if (ws) ws.broadcast({ type: WS_MESSAGES.ANNOTATION_STATUS, uuid, status });
  },
});
registerGetFidelityReport(server, indexer, CAPTURES_DIR);
registerCompareBaseline(server, indexer, CAPTURES_DIR);
registerSetBaseline(server, indexer, CAPTURES_DIR);
registerListBaselines(server, indexer, CAPTURES_DIR);
registerListSessions(server, indexer, CAPTURES_DIR);
registerGetSession(server, indexer, CAPTURES_DIR);
registerFindSource(server, indexer, CAPTURES_DIR);
registerCheckConsistency(server, indexer, CAPTURES_DIR);
registerCheckAnnotationStatus(server, indexer, CAPTURES_DIR);
registerCompareScreenshots(server, indexer, CAPTURES_DIR);
registerDiffAnnotations(server, indexer, CAPTURES_DIR);
registerDetectRecurring(server, indexer, CAPTURES_DIR);
registerVisualizeFlow(server, indexer, CAPTURES_DIR);
registerGenerateSpec(server, indexer, CAPTURES_DIR);
registerAnalyzePatterns(server, indexer, CAPTURES_DIR);
registerAnalyzeJourney(server, indexer, CAPTURES_DIR);
registerGetCaptureStats(server, indexer, CAPTURES_DIR);
registerValidateCapture(server, indexer, CAPTURES_DIR);
registerCompareStyles(server, indexer, CAPTURES_DIR);
registerGetComponentCoverage(server, indexer, CAPTURES_DIR);
registerGetCaptureHistory(server, indexer);
registerVerifyFix(server, indexer, CAPTURES_DIR);
registerGetCaptureDiff(server, indexer, CAPTURES_DIR);
registerGetSessionStatus(server, indexer);
} // end !SLIM_MODE

// Register MCP prompts (discoverable by any MCP client via prompts/list)
registerPrompts(server);

if (SLIM_MODE) {
  process.stderr.write(`${LOG_PREFIX} Slim mode: 9 core tools registered\n`);
}

// ---------------------------------------------------------------------------
// File indexing  -  parse metadata from a capture file and add to index
// ---------------------------------------------------------------------------

async function indexFile(filename, filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const result = parseMetadata(content);
    if (result.ok) {
      indexer.add(filename, result.data);
    } else {
      console.error(`${LOG_PREFIX} Skipping ${filename}: ${result.error}`);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Error reading ${filename}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

let watcher;
let httpReceiver;

async function main() {
  console.error(`${LOG_PREFIX} ViewGraph MCP Server v${SERVER_VERSION}`);
  console.error(`${LOG_PREFIX} Captures dir: ${CAPTURES_DIR}`);
  if (ALLOWED_DIRS.length > 1) {
    console.error(`${LOG_PREFIX} Allowed dirs: ${ALLOWED_DIRS.join(', ')}`);
  }

  // Validate and auto-create captures directory
  if (!existsSync(CAPTURES_DIR)) {
    try {
      mkdirSync(CAPTURES_DIR, { recursive: true });
      console.error(`${LOG_PREFIX} Created captures dir: ${CAPTURES_DIR}`);
    } catch (err) {
      console.error(`${LOG_PREFIX} ERROR: Cannot create captures dir: ${err.message}`);
      process.exit(1);
    }
  }

  // Auth removed for beta - see ADR-010-remove-http-auth-beta.md
  // Server binds to localhost only. Format validation provides defense.

  // Start HTTP receiver for extension communication
  httpReceiver = createHttpReceiver({ queue: requestQueue, capturesDir: CAPTURES_DIR, allowedDirs: ALLOWED_DIRS, port: HTTP_PORT ?? 9876, indexer, onActivity: resetIdleTimer, idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES });
  await httpReceiver.start();

  // Start idle timeout (resets on any activity)
  resetIdleTimer();

  // Rolling archive: move eligible resolved captures on startup (non-blocking)
  runArchive(CAPTURES_DIR).catch(() => {});

  watcher = createWatcher(CAPTURES_DIR, {
    onAdd: indexFile,
    onChange: indexFile,
    onRemove: (filename) => indexer.remove(filename),
  });

  // Transport auto-detection (F16 Phase 2, ADR-013):
  // - Chrome native messaging host: --native-host flag -> length-prefixed JSON on stdin
  // - stdin is pipe: MCP client launched us -> start stdio transport
  // - stdin is TTY: manual start -> HTTP-only mode (no MCP)
  const isNativeHost = process.argv.includes('--native-host');

  if (isNativeHost) {
    // Native messaging mode: Chrome/Firefox launched us as a native host.
    // Read length-prefixed JSON from stdin, respond on stdout.
    const configDir = path.resolve(CAPTURES_DIR, '..');
    const handler = createMessageHandler({
      capturesDir: CAPTURES_DIR,
      indexer,
      queue: requestQueue,
      getInfo: () => httpReceiver.getInfo?.() || { capturesDir: CAPTURES_DIR, serverVersion: SERVER_VERSION },
      getConfig: () => {
        try { return JSON.parse(readFileSync(path.resolve(configDir, 'config.json'), 'utf-8')); } catch { return {}; }
      },
      updateConfig: async (updates) => {
        const cfgPath = path.resolve(configDir, 'config.json');
        let cfg = {};
        try { cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')); } catch { /* new */ }
        // S1-3: Apply same whitelist as HTTP PUT /config
        const sanitized = {};
        for (const [k, v] of Object.entries(updates)) {
          if (ALLOWED_CONFIG_KEYS.has(k)) sanitized[k] = v;
        }
        Object.assign(cfg, sanitized);
        writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        return cfg;
      },
      writeCapture: async (payload) => {
        const filename = `viewgraph-${Date.now()}.json`;
        writeFileSync(path.resolve(CAPTURES_DIR, filename), JSON.stringify(payload, null, 2));
        indexer.add(filename, payload);
        return filename;
      },
    });

    let buf = Buffer.alloc(0);
    process.stdin.on('data', async (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const msgLen = buf.readUInt32LE(0);
        if (buf.length < 4 + msgLen) break;
        const msgBuf = buf.subarray(0, 4 + msgLen);
        buf = buf.subarray(4 + msgLen);
        try {
          const decoded = decodeMessage(msgBuf);
          const response = await handler(decoded);
          process.stdout.write(encodeMessage(response));
        } catch (err) {
          process.stdout.write(encodeMessage({ error: err.message }));
        }
      }
    });
    // Detect browser/parent death: when stdin closes, switch to HTTP-only mode.
    // The idle timer will shut down the server if no HTTP activity occurs.
    process.stdin.on('end', () => {
      console.error(`${LOG_PREFIX} stdin closed - switching to HTTP-only mode (idle timeout: ${IDLE_TIMEOUT_MINUTES}min)`);
      startStdinCloseFallback();
    });
    console.error(`${LOG_PREFIX} Native messaging host mode + HTTP (port ${HTTP_PORT ?? 9876})`);
  } else if (!process.stdin.isTTY) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Detect parent agent death: when stdin closes, switch to HTTP-only mode.
    // The idle timer will shut down the server if no HTTP activity occurs.
    process.stdin.on('end', () => {
      console.error(`${LOG_PREFIX} stdin closed - switching to HTTP-only mode (idle timeout: ${IDLE_TIMEOUT_MINUTES}min)`);
      startStdinCloseFallback();
    });
    console.error(`${LOG_PREFIX} MCP server running on stdio + HTTP (port ${HTTP_PORT ?? 9876})`);
  } else {
    console.error(`${LOG_PREFIX} Standalone mode - HTTP only (port ${HTTP_PORT ?? 9876}). No MCP client detected.`);
    console.error(`${LOG_PREFIX} To connect an agent, add to MCP config: { "command": "npx", "args": ["-y", "@viewgraph/core"] }`);
  }
}

// ---------------------------------------------------------------------------
// Idle timeout  -  auto-shutdown after inactivity
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES > 0 ? IDLE_TIMEOUT_MINUTES * 60_000 : 0;
let idleTimer = null;

/**
 * Reset the idle shutdown timer. Called on any activity (MCP tool call,
 * HTTP request, WebSocket message). Uses unref() so the timer alone
 * won't keep the process alive.
 */
function resetIdleTimer() {
  if (IDLE_TIMEOUT_MS <= 0) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => shutdown('idle-timeout'), IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

/** Fallback timeout for stdin close when idle timeout is disabled (60 min). */
const STDIN_CLOSE_FALLBACK_MS = 60 * 60_000;

/**
 * Start a fallback shutdown timer after stdin closes.
 * Used when idle timeout is disabled (0) to prevent orphaned processes.
 */
function startStdinCloseFallback() {
  if (IDLE_TIMEOUT_MS > 0) { resetIdleTimer(); return; }
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => shutdown('stdin-close-fallback'), STDIN_CLOSE_FALLBACK_MS);
  idleTimer.unref();
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  console.error(`${LOG_PREFIX} Shutting down (${signal})`);
  if (httpReceiver) httpReceiver.stop();
  if (watcher) watcher.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error(`${LOG_PREFIX} Fatal error:`, err);
  process.exit(1);
});
