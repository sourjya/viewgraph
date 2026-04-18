/**
 * MCP Tool: list_sessions
 *
 * Lists capture sessions - groups of sequential captures that represent
 * a user journey (e.g., "checkout flow"). Sessions are identified by
 * metadata.session.id in capture files.
 *
 * Scans all indexed captures, groups by session ID, and returns session
 * summaries with step count, name, and time range.
 *
 * @see docs/roadmap/roadmap.md - Capture Sessions
 */

import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

/**
 * Register the list_sessions MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} indexer
 * @param {string} capturesDir
 */
export function register(server, indexer, capturesDir) {
  server.tool(
    'list_sessions',
    `List capture sessions from ${PROJECT_NAME}. Sessions group sequential captures ` +
    'into named user journeys (e.g., "checkout flow"). Returns session ID, name, step count, and time range.',
    {},
    async () => {
      const filenames = indexer.list().map((e) => e.filename);
      const results = await readAndParseMulti(filenames, capturesDir);
      const sessions = {};
      for (const { filename, parsed } of results) {
        const session = parsed.metadata?.session;
        if (!session?.id) continue;
        if (!sessions[session.id]) {
          sessions[session.id] = {
            id: session.id,
            name: session.name || null,
            steps: [],
          };
        }
        sessions[session.id].steps.push({
          step: session.step,
          note: session.note || null,
          filename,
          url: parsed.metadata?.url,
          timestamp: parsed.metadata?.timestamp,
        });
      }

      // Sort steps within each session and compute time range
      const result = Object.values(sessions).map((s) => {
        s.steps.sort((a, b) => a.step - b.step);
        return {
          id: s.id,
          name: s.name,
          totalSteps: s.steps.length,
          firstStep: s.steps[0]?.timestamp,
          lastStep: s.steps[s.steps.length - 1]?.timestamp,
          urls: [...new Set(s.steps.map((st) => st.url).filter(Boolean))],
        };
      });

      result.sort((a, b) => (b.lastStep || '').localeCompare(a.lastStep || ''));

      return jsonResponse({
        summary: `${result.length} session(s)`,
        sessions: result,
      });
    },
  );
}
