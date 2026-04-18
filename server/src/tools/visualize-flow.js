/**
 * MCP Tool: visualize_flow
 *
 * Builds a state machine diagram from a recorded session (multi-step flow).
 * Shows what changes between each step: elements added, removed, headings.
 * Returns a Mermaid diagram that can be rendered in any Markdown viewer.
 *
 * @see src/analysis/state-machine.js
 * @see docs/roadmap/roadmap.md - M15.4
 */

import { z } from 'zod';
import { PROJECT_NAME } from '#src/constants.js';
import { buildStateMachine } from '#src/analysis/state-machine.js';
import { jsonResponse, errorResponse, readAndParseMulti } from '#src/utils/tool-helpers.js';

/**
 * Register the visualize_flow MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'visualize_flow',
    `Build a state machine diagram from a recorded ${PROJECT_NAME} session. ` +
    'Shows what changes between each step. Returns a Mermaid diagram.',
    {
      filenames: z.array(z.string()).min(2).max(20).describe('Capture filenames in step order'),
    },
    async ({ filenames }) => {
      const results = await readAndParseMulti(filenames, capturesDir);
      const steps = results.map((r, i) => {
        const session = r.parsed.session;
        return {
          step: session?.step ?? i + 1,
          note: session?.note || r.parsed.metadata?.title || `Step ${i + 1}`,
          parsed: r.parsed,
        };
      });

      if (steps.length < 2) {
        return errorResponse('Need at least 2 valid captures to build a flow');
      }

      const result = buildStateMachine(steps);
      return jsonResponse({
        steps: result.states.length,
        transitionCount: result.transitions.length,
        states: result.states,
        transitions: result.transitions,
        mermaid: result.mermaid,
      });
    },
  );
}
