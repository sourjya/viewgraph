/**
 * MCP Tool: compare_styles
 *
 * Diffs computed styles between two captures for a given element (by node ID).
 * Returns changed, added, and removed CSS properties with before/after values.
 * Useful for answering "what changed about this button's styling?"
 *
 * @see docs/roadmap/feature-specs.md - F7
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { PROJECT_NAME } from '#src/constants.js';
import { validateCapturePath } from '#src/utils/validate-path.js';
import { parseCapture } from '#src/parsers/viewgraph-v2.js';
import { getNodeDetails } from '#src/analysis/node-queries.js';

/**
 * Register the compare_styles MCP tool.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('#src/indexer.js').Indexer} _indexer
 * @param {string} capturesDir
 */
export function register(server, _indexer, capturesDir) {
  server.tool(
    'compare_styles',
    `Compare computed CSS styles of an element between two ${PROJECT_NAME} captures. ` +
    'Returns changed, added, and removed properties with before/after values.',
    {
      file_a: z.string().describe('First capture filename (before)'),
      file_b: z.string().describe('Second capture filename (after)'),
      element_id: z.string().describe('Node ID to compare (e.g., "btn001")'),
    },
    async ({ file_a, file_b, element_id }) => {
      let pathA, pathB;
      try { pathA = validateCapturePath(file_a, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${file_a}` }], isError: true };
      }
      try { pathB = validateCapturePath(file_b, capturesDir); } catch {
        return { content: [{ type: 'text', text: `Error: Invalid filename - ${file_b}` }], isError: true };
      }

      let capA, capB;
      try {
        const [rawA, rawB] = await Promise.all([readFile(pathA, 'utf-8'), readFile(pathB, 'utf-8')]);
        capA = parseCapture(rawA);
        capB = parseCapture(rawB);
        if (!capA.ok || !capB.ok) return { content: [{ type: 'text', text: 'Error: Failed to parse captures' }], isError: true };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }

      const detailsA = getNodeDetails(capA.data, element_id);
      const detailsB = getNodeDetails(capB.data, element_id);

      if (!detailsA && !detailsB) {
        return { content: [{ type: 'text', text: `Error: Element "${element_id}" not found in either capture` }], isError: true };
      }

      const stylesA = detailsA?.computedStyles || {};
      const stylesB = detailsB?.computedStyles || {};
      const allKeys = new Set([...Object.keys(stylesA), ...Object.keys(stylesB)]);

      const changed = [];
      const added = [];
      const removed = [];

      for (const key of allKeys) {
        const a = stylesA[key];
        const b = stylesB[key];
        if (a !== undefined && b !== undefined && a !== b) {
          changed.push({ property: key, before: a, after: b });
        } else if (a === undefined && b !== undefined) {
          added.push({ property: key, value: b });
        } else if (a !== undefined && b === undefined) {
          removed.push({ property: key, value: a });
        }
      }

      const result = {
        elementId: element_id,
        fileA: file_a,
        fileB: file_b,
        foundInA: !!detailsA,
        foundInB: !!detailsB,
        changed,
        added,
        removed,
        unchanged: allKeys.size - changed.length - added.length - removed.length,
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
