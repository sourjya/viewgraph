/**
 * MCP Tool: get_session_status
 *
 * Returns a summary of the current ViewGraph session: capture count,
 * annotation stats, baseline count, and actionable next-step suggestions.
 * Lightweight - queries the in-memory index only, no disk reads.
 *
 * @see ADR-011 MCP server instructions
 * @see .kiro/specs/mcp-agent-guidance/design.md
 */

import { PROJECT_NAME } from '#src/constants.js';
import { jsonResponse } from '#src/utils/tool-helpers.js';

/**
 * Register the get_session_status tool.
 * @param {McpServer} server
 * @param {object} indexer - In-memory capture indexer
 */
export function register(server, indexer) {
  server.tool(
    'get_session_status',
    `Get a summary of the current ${PROJECT_NAME} session: capture count, pages, ` +
    'annotations, baselines, and actionable suggestions. Call this first to understand ' +
    'what data is available before choosing which tools to use.',
    {},
    async () => {
      const entries = indexer.list();
      const pages = [...new Set(entries.map((e) => e.url).filter(Boolean).map((u) => {
        try { const p = new URL(u); return `${p.hostname}${p.port ? ':' + p.port : ''}`; } catch { return u; }
      }))];

      const annotations = { total: 0, unresolved: 0, resolved: 0 };
      for (const entry of entries) {
        const count = entry.annotationCount || 0;
        const resolved = entry.resolvedCount || 0;
        annotations.total += count;
        annotations.resolved += resolved;
        annotations.unresolved += count - resolved;
      }

      const baselines = entries.filter((e) => e.isBaseline).length;

      const latest = entries[0];
      const latestAge = latest ? timeSince(latest.timestamp) : null;

      // Actionable suggestions based on current state
      const suggestions = [];
      if (entries.length === 0) {
        suggestions.push('No captures yet - use request_capture to ask the user to capture a page');
      } else {
        if (annotations.unresolved > 0) {
          suggestions.push(`${annotations.unresolved} unresolved annotations - use get_unresolved to review`);
        }
        if (latestAge) {
          suggestions.push(`Latest capture: ${latestAge} (${latest.filename})`);
        }
        if (baselines > 0) {
          suggestions.push(`${baselines} baseline${baselines > 1 ? 's' : ''} set - use compare_baseline to check for regressions`);
        }
        if (annotations.total === 0) {
          suggestions.push('No annotations yet - use get_page_summary to review the latest capture');
        }
      }

      const status = {
        captures: { total: entries.length, latest: latest?.filename || null, latestAge, pages },
        annotations,
        baselines: { total: baselines },
        suggestions,
      };

      return jsonResponse(status);
    },
  );
}

/** Human-readable time since a timestamp. */
function timeSince(ts) {
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}
