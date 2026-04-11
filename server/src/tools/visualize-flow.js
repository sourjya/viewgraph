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
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { buildStateMachine } from '#src/analysis/state-machine.js';

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
      const steps = [];
      for (let i = 0; i < filenames.length; i++) {
        try {
          const filePath = validateCapturePath(filenames[i], capturesDir);
          const raw = await readFile(filePath, 'utf-8');
          const result = parseCapture(raw);
          if (!result.ok) continue;
          const session = result.data.session;
          steps.push({
            step: session?.step ?? i + 1,
            note: session?.note || result.data.metadata?.title || `Step ${i + 1}`,
            parsed: result.data,
          });
        } catch { continue; }
      }

      if (steps.length < 2) {
        return { content: [{ type: 'text', text: 'Need at least 2 valid captures to build a flow' }], isError: true };
      }

      const result = buildStateMachine(steps);
      return { content: [{ type: 'text', text: JSON.stringify({
        steps: result.states.length,
        transitions: result.transitions.length,
        states: result.states,
        transitions: result.transitions,
        mermaid: result.mermaid,
      }, null, 2) }] };
    },
  );
}
