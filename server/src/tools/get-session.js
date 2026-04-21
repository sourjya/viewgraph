/**
 * MCP Tool: get_session
 *
 * Returns the full step sequence for a capture session, including per-step
 * metadata, notes, and structural diffs between consecutive steps.
 *
 * The agent can see "between step 2 and step 3, the cart count went from
 * 0 to 1 and a toast appeared" - making multi-page flows debuggable.
 *
 * @see docs/roadmap/roadmap.md - Capture Sessions
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseSummary } from '#src/parsers/viewgraph-v2.js';
import { jsonResponse, errorResponse } from '#src/utils/tool-helpers.js';
import { NOTICE_COMMENTS } from '#src/utils/tool-helpers.js';

/**
 * Register the get_session MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'get_session',
    `Return the full step sequence for a ${PROJECT_NAME} capture session. ` +
    'Includes per-step page summary, notes, and element count changes between steps.',
    {
      session_id: z.string().describe('Session ID (e.g., ses_1712834400)'),
    },
    async ({ session_id }) => {
      const steps = [];

      for (const entry of indexer.list()) {
        let filePath;
        try { filePath = validateCapturePath(entry.filename, capturesDir); } catch { continue; }
        try {
          const raw = await readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          const session = parsed.metadata?.session;
          if (session?.id !== session_id) continue;

          const summaryResult = parseSummary(raw);
          steps.push({
            step: session.step,
            note: session.note || null,
            filename: entry.filename,
            url: parsed.metadata?.url,
            title: parsed.metadata?.title,
            timestamp: parsed.metadata?.timestamp,
            nodeCount: parsed.metadata?.stats?.totalNodes ?? 0,
            summary: summaryResult.ok ? summaryResult.data : null,
          });
        } catch { continue; }
      }

      if (steps.length === 0) {
        return errorResponse(`Error: No captures found for session "${session_id}"`);
      }

      steps.sort((a, b) => a.step - b.step);

      // Compute diffs between consecutive steps
      const diffs = [];
      for (let i = 1; i < steps.length; i++) {
        const prev = steps[i - 1];
        const curr = steps[i];
        diffs.push({
          from: prev.step,
          to: curr.step,
          urlChanged: prev.url !== curr.url,
          titleChanged: prev.title !== curr.title,
          nodeCountDelta: curr.nodeCount - prev.nodeCount,
        });
      }

      const name = steps[0]?.summary?.data?.page?.title || null;

      return jsonResponse({
        _notice: NOTICE_COMMENTS,
        sessionId: session_id,
        name,
        totalSteps: steps.length,
        steps,
        diffs,
      });
    },
  );
}
