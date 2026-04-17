/**
 * Full MCP Server Integration Test
 *
 * Boots the complete ViewGraph MCP server with all 37 tools registered,
 * connects via InMemoryTransport, and validates tool discovery and basic
 * invocation through the JSON-RPC protocol - exactly as a real client
 * (Kiro, Claude Code, Cursor) would.
 *
 * @see server/index.js - server entry point
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';

// Import all tool registration functions
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
import { register as registerGetSessionStatus } from '#src/tools/get-session-status.js';
import { createIndexer } from '#src/indexer.js';
import { createRequestQueue } from '#src/request-queue.js';

describe('full MCP server integration', () => {
  let client;
  let server;
  let capturesDir;

  beforeAll(async () => {
    capturesDir = join(os.tmpdir(), `vg-integ-${Date.now()}`);
    mkdirSync(capturesDir, { recursive: true });

    server = new McpServer({ name: 'viewgraph-test', version: '0.0.1' });
    const indexer = createIndexer({ maxCaptures: 50 });
    const queue = createRequestQueue({ maxSize: 10, ttlMs: 60000 });

    // Register all 37 tools
    registerListCaptures(server, indexer);
    registerGetCapture(server, indexer, capturesDir);
    registerGetLatest(server, indexer, capturesDir);
    registerGetPageSummary(server, indexer, capturesDir);
    registerGetElementsByRole(server, indexer, capturesDir);
    registerGetInteractive(server, indexer, capturesDir);
    registerFindMissingTestids(server, indexer, capturesDir);
    registerAuditAccessibility(server, indexer, capturesDir);
    registerAuditLayout(server, indexer, capturesDir);
    registerCompareCaptures(server, indexer, capturesDir);
    registerGetAnnotations(server, indexer, capturesDir);
    registerGetAnnotatedCapture(server, indexer, capturesDir);
    registerRequestCapture(server, queue);
    registerGetRequestStatus(server, queue);
    registerGetFidelityReport(server, capturesDir);
    registerResolveAnnotation(server, indexer, capturesDir, { onResolve: () => {} });
    registerGetUnresolved(server, indexer, capturesDir);
    registerCompareBaseline(server, indexer, capturesDir);
    registerSetBaseline(server, indexer, capturesDir);
    registerListBaselines(server, indexer, capturesDir);
    registerListSessions(server, indexer, capturesDir);
    registerGetSession(server, indexer, capturesDir);
    registerFindSource(server, indexer, capturesDir);
    registerCheckConsistency(server, indexer, capturesDir);
    registerCheckAnnotationStatus(server, indexer, capturesDir);
    registerCompareScreenshots(server, indexer, capturesDir);
    registerDiffAnnotations(server, indexer, capturesDir);
    registerDetectRecurring(server, indexer, capturesDir);
    registerVisualizeFlow(server, indexer, capturesDir);
    registerGenerateSpec(server, indexer, capturesDir);
    registerAnalyzePatterns(server, indexer, capturesDir);
    registerAnalyzeJourney(server, indexer, capturesDir);
    registerGetCaptureStats(server, indexer, capturesDir);
    registerValidateCapture(server, indexer, capturesDir);
    registerCompareStyles(server, indexer, capturesDir);
    registerGetComponentCoverage(server, indexer, capturesDir);
    registerGetSessionStatus(server, indexer);

    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(ct);
  });

  afterAll(async () => {
    try { await client?.close(); } catch { /* */ }
    try { await server?.close(); } catch { /* */ }
    try { rmSync(capturesDir, { recursive: true }); } catch { /* */ }
  });

  it('(+) server registers all 37 tools', async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBe(37);
  });

  it('(+) all tool names follow snake_case convention', async () => {
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('(+) list_captures returns result with no captures', async () => {
    const res = await client.callTool({ name: 'list_captures', arguments: {} });
    expect(res.content[0].text).toBeDefined();
    // Empty state returns a text message, not JSON
    expect(res.content[0].text.toLowerCase()).toContain('no captures');
  });

  it('(+) get_session_status returns valid structure', async () => {
    const res = await client.callTool({ name: 'get_session_status', arguments: {} });
    const data = JSON.parse(res.content[0].text);
    expect(data).toHaveProperty('captures');
    expect(data).toHaveProperty('annotations');
    expect(data).toHaveProperty('suggestions');
  });

  it('(+) request_capture creates a pending request', async () => {
    const res = await client.callTool({
      name: 'request_capture',
      arguments: { url: 'http://localhost:3000', guidance: 'Test capture' },
    });
    const data = JSON.parse(res.content[0].text);
    expect(data).toHaveProperty('requestId');
    expect(data.status).toBe('pending');
  });

  it('(+) every tool has a description', async () => {
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      expect(tool.description?.length).toBeGreaterThan(10);
    }
  });
});
